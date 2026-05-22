import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore'; 
import Pedido from '../components/Pedido';
import './Menu.css';
import './Produtos.css'; 

export default function Menu() {
  const [produtos, setProdutos] = useState([]);
  const [pedidosPendentes, setPedidosPendentes] = useState([]); // Lista de Pendentes
  const [pedidosEntregues, setPedidosEntregues] = useState([]); // Lista de Entregues (Histórico)
  
  const [isPedidoModalOpen, setIsPedidoModalOpen] = useState(false);
  const [isVerPedidosOpen, setIsVerPedidosOpen] = useState(false); 
  const [isHistoricoOpen, setIsHistoricoOpen] = useState(false); // Estado para o novo pop-up de histórico

  useEffect(() => {
    // 1. Busca os Produtos (Estoque físico)
    const unsubProdutos = onSnapshot(collection(db, "produtos"), (snapshot) => {
      setProdutos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Busca TODOS os Pedidos e separa por status em tempo real
    const unsubPedidos = onSnapshot(collection(db, "pedidos"), (snapshot) => {
      const listaPedidos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Separa os pendentes dos entregues
      setPedidosPendentes(listaPedidos.filter(p => p.status === 'pendente'));
      
      // Ordena o histórico para mostrar os entregues mais recentes no topo
      const entregues = listaPedidos.filter(p => p.status === 'entregue');
      entregues.sort((a, b) => new Date(b.dataEntrega) - new Date(a.dataEntrega));
      setPedidosEntregues(entregues);
    });

    return () => { unsubProdutos(); unsubPedidos(); };
  }, []);

  // FUNÇÃO ATUALIZADA: Entrega o pedido e DESCONTA do estoque automaticamente
  const finalizarEntregaPedido = async (pedido) => {
    if (window.confirm(`Deseja entregar o pedido de ${pedido.clienteNome}? Isso vai dar baixa automática no estoque.`)) {
      try {
        
        // 1. Loop por cada item dentro do pedido para descontar do estoque físico
        for (const item of pedido.itens) {
          // Encontra o produto correspondente na nossa lista
          const produtoFisico = produtos.find(p => p.id === item.produtoId);
          
          if (produtoFisico) {
            const estoqueAtual = produtoFisico.estoque || 0;
            // Calcula o novo estoque (garantindo que não fique menor que zero)
            const novoEstoque = Math.max(0, estoqueAtual - item.quantidade);
            
            // Atualiza o estoque do produto lá no Firebase
            await updateDoc(doc(db, "produtos", item.produtoId), {
              estoque: novoEstoque
            });
          }
        }

        // 2. Muda o status do pedido para 'entregue' e salva o momento da entrega
        await updateDoc(doc(db, "pedidos", pedido.id), {
          status: 'entregue',
          dataEntrega: new Date().toISOString()
        });

        alert("Pedido entregue e estoque atualizado com sucesso! 🎉");
      } catch (erro) {
        console.error("Erro ao entregar pedido:", erro);
        alert("Erro ao processar a entrega.");
      }
    }
  };

  // ================= MATEMÁTICA DO ESTOQUE VS ENCOMENDAS =================
  
  // Calcula o total de trufas nos pedidos que ainda estão pendentes
  const totalEncomendas = pedidosPendentes.reduce((acc, pedido) => acc + pedido.totalTrufas, 0);

  // Calcula para CADA produto: Quanto tem, quanto pediram, e quanto falta produzir
  const relatorioProducao = produtos.map(produto => {
    const encomendadoDesteSabor = pedidosPendentes.reduce((total, pedido) => {
      const itemNoPedido = pedido.itens.find(i => i.produtoId === produto.id);
      return total + (itemNoPedido ? itemNoPedido.quantidade : 0);
    }, 0);

    const estoqueFisico = produto.estoque || 0;
    const faltaProduzir = encomendadoDesteSabor > estoqueFisico ? encomendadoDesteSabor - estoqueFisico : 0;

    return {
      ...produto,
      encomendado: encomendadoDesteSabor,
      faltaProduzir: faltaProduzir
    };
  });

  relatorioProducao.sort((a, b) => b.faltaProduzir - a.faltaProduzir);

  return (
    <div className="menu-container">
      <h1 className="header-title">📊 Resumo do Dia</h1>

      <div className="dashboard-grid">
        <div className="dash-card">
          <h3>Total de Trufas Encomendadas</h3>
          <p style={{ color: '#8b5cf6' }}>{totalEncomendas} <span style={{fontSize: '1.2rem', color: '#64748b'}}>un.</span></p>
        </div>
        
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
          <h3>Pedidos Pendentes</h3>
          <p style={{ color: '#ec4899' }}>{pedidosPendentes.length}</p>
          
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button 
              className="btn btn-warning" 
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              onClick={() => setIsVerPedidosOpen(true)}
            >
              👁️ Ver Quem Pediu
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '0.85rem', backgroundColor: '#64748b', color: 'white' }}
              onClick={() => setIsHistoricoOpen(true)}
            >
              📜 Histórico
            </button>
          </div>
        </div>
      </div>

      {/* TABELA DE PRODUÇÃO */}
      <div className="card">
        <h2 style={{ marginBottom: '20px', color: '#0f172a' }}>O que preciso produzir?</h2>
        <div className="table-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Sabor da Trufa</th>
                <th>Na Geladeira</th>
                <th>Encomendado</th>
                <th>Status (Falta?)</th>
              </tr>
            </thead>
            <tbody>
              {relatorioProducao.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.nome}</strong></td>
                  <td style={{ color: '#64748b' }}>{item.estoque} un.</td>
                  <td style={{ fontWeight: 'bold' }}>{item.encomendado} un.</td>
                  <td>
                    {item.faltaProduzir > 0 ? (
                      <span className="status-falta">Falta fazer: {item.faltaProduzir}</span>
                    ) : (
                      <span className="status-ok">Tudo certo ✅</span>
                    )}
                  </td>
                </tr>
              ))}
              {relatorioProducao.length === 0 && (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Nenhum produto cadastrado para calcular.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Botão Flutuante */}
      <button className="fab-button" onClick={() => setIsPedidoModalOpen(true)} title="Nova Encomenda">
        ➕
      </button>

      <Pedido isOpen={isPedidoModalOpen} onClose={() => setIsPedidoModalOpen(false)} />

      {/* POP-UP 1: VER QUEM PEDIU (PENDENTES) */}
      {isVerPedidosOpen && (
        <div className="modal-overlay" onClick={() => setIsVerPedidosOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h2>📋 Encomendas Pendentes</h2>
              <button className="close-btn" onClick={() => setIsVerPedidosOpen(false)}>✖</button>
            </div>
            <div className="table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Itens do Pedido</th>
                    <th>Total</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosPendentes.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhum pedido pendente! 🎉</td></tr>
                  ) : (
                    pedidosPendentes.map((pedido) => (
                      <tr key={pedido.id}>
                        <td>
                          <strong>{pedido.clienteNome}</strong>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                            📅 {pedido.dataPedido ? new Date(pedido.dataPedido).toLocaleDateString('pt-BR') : 'Sem data'}
                          </div>
                        </td>
                        <td>
                          <ul style={{ margin: 0, paddingLeft: '15px', fontSize: '0.9rem' }}>
                            {pedido.itens?.map((item, idx) => (
                              <li key={idx}>{item.nome} x <strong>{item.quantidade}</strong></li>
                            ))}
                          </ul>
                        </td>
                        <td style={{ fontWeight: 'bold', color: '#059669' }}>R$ {(pedido.valorTotal || 0).toFixed(2).replace('.', ',')}</td>
                        <td>
                          {/* PASSANDO O PEDIDO COMPLETO PARA A FUNÇÃO DAR BAIXA */}
                          <button className="btn btn-success" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => finalizarEntregaPedido(pedido)}>
                            ✓ Entregar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= POP-UP 2: HISTÓRICO DE PEDIDOS ENTREGUES ================= */}
      {isHistoricoOpen && (
        <div className="modal-overlay" onClick={() => setIsHistoricoOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h2>📜 Histórico de Pedidos Entregues</h2>
              <button className="close-btn" onClick={() => setIsHistoricoOpen(false)}>✖</button>
            </div>
            <div className="table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Itens Entregues</th>
                    <th>Total Pago</th>
                    <th>Entregue Em</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosEntregues.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhum pedido entregue ainda.</td></tr>
                  ) : (
                    pedidosEntregues.map((pedido) => (
                      <tr key={pedido.id}>
                        <td>
                          <strong>{pedido.clienteNome}</strong>
                        </td>
                        <td>
                          <ul style={{ margin: 0, paddingLeft: '15px', fontSize: '0.9rem', color: '#475569' }}>
                            {pedido.itens?.map((item, idx) => (
                              <li key={idx}>{item.nome} x {item.quantidade} un.</li>
                            ))}
                          </ul>
                        </td>
                        <td style={{ fontWeight: 'bold', color: '#2563eb' }}>
                          R$ {(pedido.valorTotal || 0).toFixed(2).replace('.', ',')}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          {pedido.dataEntrega ? new Date(pedido.dataEntrega).toLocaleString('pt-BR') : 'Sem data'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}