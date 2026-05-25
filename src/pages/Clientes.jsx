import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import './Clientes.css';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  
  // Campos do formulário
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [trufasCompradas, setTrufasCompradas] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  
  // Estado para controlar o menu de ações no celular
  const [menuAbertoId, setMenuAbertoId] = useState(null);

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

    const dadosDoCliente = {
      nome: nome,
      telefone: telefone || 'Não informado',
      trufasCompradas: parseInt(trufasCompradas) || 0,
      dataCadastro: editandoId ? undefined : new Date().toISOString() 
    };

    try {
      if (editandoId) {
        delete dadosDoCliente.dataCadastro; 
        await updateDoc(doc(db, "clientes", editandoId), dadosDoCliente);
      } else {
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
    if (window.confirm("Tem certeza que deseja apagar este cliente?")) {
      await deleteDoc(doc(db, "clientes", id));
    }
    setMenuAbertoId(null);
  };

  const adicionarTrufa = async (id, quantidadeAtual) => {
    await updateDoc(doc(db, "clientes", id), { 
      trufasCompradas: quantidadeAtual + 1 
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

      {/* Lista de Clientes (Versão Mobile/Cards) */}
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
                    <span className="label-min">Histórico</span>
                    <span className="historico-numero">{cliente.trufasCompradas}</span>
                  </div>
                  <button className="btn-add-trufa" onClick={() => adicionarTrufa(cliente.id, cliente.trufasCompradas)} title="Adicionar +1 compra">
                    +1 Trufa
                  </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}