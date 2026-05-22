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

  useEffect(() => {
    // Busca os clientes em tempo real do Firebase
    const unsubscribe = onSnapshot(collection(db, "clientes"), (snapshot) => {
      const listaClientes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Ordena por quem comprou mais trufas
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
      // Se for novo, salva a data de hoje. Se estiver editando, mantém a data que já tinha.
      dataCadastro: editandoId ? undefined : new Date().toISOString() 
    };

    try {
      if (editandoId) {
        // Para não apagar a data original ao editar
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
  };

  const excluirCliente = async (id) => {
    if (window.confirm("Tem certeza que deseja apagar este cliente?")) {
      await deleteDoc(doc(db, "clientes", id));
    }
  };

  // Botão rápido para adicionar +1 trufa no histórico do cliente
  const adicionarTrufa = async (id, quantidadeAtual) => {
    await updateDoc(doc(db, "clientes", id), { 
      trufasCompradas: quantidadeAtual + 1 
    });
  };

  // Calcula se faz dias, meses ou anos que é cliente
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
          <div className="input-group" style={{ flex: '2' }}>
            <label>Nome do Cliente *</label>
            <input className="modern-input" type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Maria Silva" />
          </div>
          <div className="input-group" style={{ flex: '1.5' }}>
            <label>WhatsApp / Telefone</label>
            <input className="modern-input" type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(53) 99999-9999" />
          </div>
          <div className="input-group" style={{ flex: '1' }}>
            <label>Trufas Compradas</label>
            <input className="modern-input" type="number" value={trufasCompradas} onChange={(e) => setTrufasCompradas(e.target.value)} placeholder="0" title="Total que já comprou na vida" />
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className={`btn ${editandoId ? 'btn-primary' : 'btn-success'}`}>
              {editandoId ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
            </button>
            {editandoId && (
              <button type="button" className="btn btn-secondary" onClick={() => { setEditandoId(null); setNome(''); setTelefone(''); setTrufasCompradas(''); }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Tabela de Clientes */}
      <div className="card">
        <div className="table-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Cliente & Contato</th>
                <th>Tempo</th>
                <th>Histórico (Trufas)</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {clientes.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Nenhum cliente cadastrado. Cadastre o primeiro para ver a mágica!
                  </td>
                </tr>
              ) : (
                clientes.map((cliente) => (
                  <tr key={cliente.id}>
                    <td>
                      <strong>{cliente.nome}</strong>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                        📞 {cliente.telefone}
                      </div>
                    </td>
                    <td>
                      <span className="badge-tempo">
                        {calcularTempo(cliente.dataCadastro)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#8b5cf6' }}>
                          {cliente.trufasCompradas}
                        </span>
                        <button className="btn-add-trufa" onClick={() => adicionarTrufa(cliente.id, cliente.trufasCompradas)} title="Adicionar +1 compra">
                          +1 Trufa
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="actions-group">
                        <button className="btn btn-warning" onClick={() => prepararEdicao(cliente)}>Editar</button>
                        <button className="btn btn-danger" onClick={() => excluirCliente(cliente.id)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}