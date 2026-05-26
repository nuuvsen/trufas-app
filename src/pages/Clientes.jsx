import { useState, useEffect } from 'react';
import { db } from '../firebase';
// ATENÇÃO: Adicionamos o arrayUnion aqui nos imports do Firestore!
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, arrayUnion } from 'firebase/firestore';
import './Clientes.css';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  
  // Campos do formulário
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [trufasCompradas, setTrufasCompradas] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  
  // Estados de controle de Menus e Pop-ups
  const [menuAbertoId, setMenuAbertoId] = useState(null);
  const [historicoAbertoId, setHistoricoAbertoId] = useState(null); // Controla de qual cliente o histórico está aberto

  // Procura o cliente selecionado para mostrar no modal de histórico
  const clienteModal = clientes.find(c => c.id === historicoAbertoId);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "clientes"), (snapshot) => {
      const listaClientes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      listaClientes.sort((a, b) => b.trufasCompradas - a.trufasCompradas);
      setClientes(listaClientes);
    });
    return () => unsubscribe();
  }, []);

  const salvarCliente = async (e) => {
    e.preventDefault();
    if (!nome) {
      alert("O nome do cliente é obrigatório!");
      return;
    }

    const quantidadeInicial = parseInt(trufasCompradas) || 0;

    const dadosDoCliente = {
      nome: nome,
      telefone: telefone || 'Não informado',
      trufasCompradas: quantidadeInicial,
      dataCadastro: editandoId ? undefined : new Date().toISOString() 
    };

    try {
      if (editandoId) {
        delete dadosDoCliente.dataCadastro; 
        await updateDoc(doc(db, "clientes", editandoId), dadosDoCliente);
      } else {
        // Se for um cliente NOVO, já criamos a lista de histórico dele
        dadosDoCliente.historico = [{
          tipo: 'cadastro',
          quantidade: quantidadeInicial,
          data: new Date().toISOString()
        }];
        await addDoc(collection(db, "clientes"), dadosDoCliente);
      }
      setNome(''); setTelefone(''); setTrufasCompradas(''); setEditandoId(null);
    } catch (erro) {
      alert("Erro ao salvar o cliente.");
    }
  };

  const prepararEdicao = (cliente) => {
    setNome(cliente.nome);
    setTelefone(cliente.telefone === 'Não informado' ? '' : cliente.telefone);
    setTrufasCompradas(cliente.trufasCompradas);
    setEditandoId(cliente.id);
    setMenuAbertoId(null);
  };

  const excluirCliente = async (id) => {
    if (window.confirm("Tem certeza que deseja apagar este cliente? Todo o histórico dele será perdido.")) {
      await deleteDoc(doc(db, "clientes", id));
    }
    setMenuAbertoId(null);
  };

  // Nova função que adiciona ou remove trufas e salva no histórico!
  const alterarTrufas = async (cliente, alteracao) => {
    const novaQuantidade = (cliente.trufasCompradas || 0) + alteracao;
    
    // Não permite que o cliente tenha trufas negativas
    if (novaQuantidade < 0) return; 

    // Define se foi uma compra (+1) ou um cancelamento (-1)
    const tipoEvento = alteracao > 0 ? 'compra' : 'cancelamento';
    
    await updateDoc(doc(db, "clientes", cliente.id), { 
      trufasCompradas: novaQuantidade,
      historico: arrayUnion({
        tipo: tipoEvento,
        quantidade: Math.abs(alteracao), // Salva sempre positivo (ex: Cancelou 1)
        data: new Date().toISOString()
      })
    });
  };

  const toggleMenu = (id) => {
    setMenuAbertoId(menuAbertoId === id ? null : id);
  };

  const calcularTempo = (dataISO) => {
    if (!dataISO) return 'Novo';
    const dataCadastro = new Date(dataISO);
    const hoje = new Date();
    const diffTempo = Math.abs(hoje - dataCadastro);
    const diffDias = Math.floor(diffTempo / (1000 * 60 * 60 * 24));

    if (diffDias === 0) return 'Desde Hoje';
    if (diffDias === 1) return 'Desde Ontem';
    if (diffDias < 30) return `Há ${diffDias} dias`;
    const meses = Math.floor(diffDias / 30);
    return `Há ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  };

  return (
    <div className="clientes-container">
      <h1 className="header-title">👥 Meus Clientes</h1>

      {/* Formulário */}
      <div className="card">
        <form onSubmit={salvarCliente} className="form-grid">
          <div className="input-group">
            <label>Nome do Cliente *</label>
            <input className="modern-input" type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Maria Silva" />
          </div>
          <div className="input-group">
            <label>WhatsApp / Telefone</label>
            <input className="modern-input" type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(53) 99999-9999" />
          </div>
          <div className="input-group">
            <label>Trufas Compradas</label>
            <input className="modern-input" type="number" value={trufasCompradas} onChange={(e) => setTrufasCompradas(e.target.value)} placeholder="0" />
          </div>
          
          <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
            <button type="submit" className={`btn ${editandoId ? 'btn-primary' : 'btn-success'}`} style={{flex: 1}}>
              {editandoId ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
            </button>
            {editandoId && (
              <button type="button" className="btn btn-secondary" style={{flex: 1}} onClick={() => { setEditandoId(null); setNome(''); setTelefone(''); setTrufasCompradas(''); }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de Clientes */}
      <div className="lista-cards">
        {clientes.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            Nenhum cliente cadastrado. Cadastre o primeiro para ver a mágica!
          </div>
        ) : (
          clientes.map((cliente) => (
            <div className="item-card" key={cliente.id}>
              
              <div className="card-header">
                <div>
                  <h3 className="card-title">{cliente.nome}</h3>
                  <div className="card-subtitle">📞 {cliente.telefone}</div>
                </div>
                <button className="btn-opcoes" onClick={() => toggleMenu(cliente.id)}>⋮</button>
              </div>

              {/* Menu de Ações Escondido */}
              {menuAbertoId === cliente.id && (
                <div className="acoes-menu">
                  {/* Novo Botão de Histórico */}
                  <button className="btn btn-secondary" onClick={() => { setHistoricoAbertoId(cliente.id); setMenuAbertoId(null); }}>📜 Histórico</button>
                  <button className="btn btn-warning" onClick={() => prepararEdicao(cliente)}>✏️ Editar</button>
                  <button className="btn btn-danger" onClick={() => excluirCliente(cliente.id)}>🗑️ Excluir</button>
                </div>
              )}

              <div className="card-body">
                <div>
                  <span className="badge-tempo">{calcularTempo(cliente.dataCadastro)}</span>
                </div>
                
                <div className="cliente-historico">
                  <div className="historico-info">
                    <span className="label-min">Total Comprado</span>
                    <span className="historico-numero">{cliente.trufasCompradas}</span>
                  </div>
                  
                  {/* Botões de Adicionar e Remover Compra */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-add-trufa" style={{ backgroundColor: '#ef4444', padding: '8px 12px' }} onClick={() => alterarTrufas(cliente, -1)} title="Cancelar compra">
                      -1
                    </button>
                    <button className="btn-add-trufa" style={{ padding: '8px 12px' }} onClick={() => alterarTrufas(cliente, 1)} title="Adicionar compra">
                      +1
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* ================= MODAL: HISTÓRICO DO CLIENTE ================= */}
      {historicoAbertoId && clienteModal && (
        <div className="modal-overlay" onClick={() => setHistoricoAbertoId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-header">
              <h2>📜 Histórico: {clienteModal.nome}</h2>
              <button className="close-btn" onClick={() => setHistoricoAbertoId(null)}>✖</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '5px' }}>
              
              {/* Verifica se o cliente possui histórico */}
              {(!clienteModal.historico || clienteModal.historico.length === 0) ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>Nenhuma movimentação registrada.</p>
              ) : (
                // Pega o histórico, inverte a ordem (para as mais recentes ficarem no topo) e exibe na tela
                [...clienteModal.historico]
                  .sort((a, b) => new Date(b.data) - new Date(a.data))
                  .map((evento, index) => (
                    <div key={index} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        
                        {/* Ícone dinâmico dependendo da ação */}
                        <span style={{ fontSize: '1.5rem' }}>
                          {evento.tipo === 'compra' ? '✅' : evento.tipo === 'cadastro' ? '🆕' : '❌'}
                        </span>
                        
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#1e293b' }}>
                            {evento.tipo === 'compra' ? 'Comprou' : evento.tipo === 'cadastro' ? 'Cadastro Inicial' : 'Cancelou compra'}
                          </div>
                          {evento.quantidade > 0 && (
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                              {evento.quantidade} trufa(s)
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Data e Hora */}
                      <div style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'right' }}>
                        <div>{new Date(evento.data).toLocaleDateString('pt-BR')}</div>
                        <div style={{ fontWeight: '600' }}>{new Date(evento.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  ))
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}