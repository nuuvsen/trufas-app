import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore'; 
import Pedido from '../components/Pedido';
import './Menu.css';

export default function Menu() {
  const [produtos, setProdutos] = useState([]);
  const [pedidosPendentes, setPedidosPendentes] = useState([]); 
  const [pedidosEntregues, setPedidosEntregues] = useState([]); 
  
  const [isPedidoModalOpen, setIsPedidoModalOpen] = useState(false);
  const [isVerPedidosOpen, setIsVerPedidosOpen] = useState(false); 
  const [isHistoricoOpen, setIsHistoricoOpen] = useState(false); 

  // ================= ESTADOS PARA SUBSTITUIR OS ALERTS FEIOS =================
  const [notificacao, setNotificacao] = useState(null); // Para mostrar "Entregue com sucesso!" no topo
  const [confirmacaoAcao, setConfirmacaoAcao] = useState(null); // Guarda os dados para o Modal de Confirmação

  useEffect(() => {
    const unsubProdutos = onSnapshot(collection(db, "produtos"), (snapshot) => {
      setProdutos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubPedidos = onSnapshot(collection(db, "pedidos"), (snapshot) => {
      const listaPedidos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPedidosPendentes(listaPedidos.filter(p => p.status === 'pendente'));
      
      const entregues = listaPedidos.filter(p => p.status === 'entregue');
      entregues.sort((a, b) => new Date(b.dataEntrega) - new Date(a.dataEntrega));
      setPedidosEntregues(entregues);
    });

    return () => { unsubProdutos(); unsubPedidos(); };
  }, []);

  // Função para mostrar um aviso bonito que some sozinho
  const mostrarNotificacao = (mensagem, tipo = 'sucesso') => {
    setNotificacao({ mensagem, tipo });
    setTimeout(() => setNotificacao(null), 3000); // Some após 3 segundos
  };

  // Funções que apenas ABREM a janela bonita de confirmação
  const pedirConfirmacaoEntrega = (pedido) => {
    setConfirmacaoAcao({
      tipo: 'entregar',
      pedido: pedido,
      titulo: 'Confirmar Entrega',
      mensagem: `Deseja entregar o pedido de ${pedido.clienteNome}? Isso vai dar baixa automática no estoque.`,
      corBotao: '#10b981', // Verde
      textoBotao: '✓ Sim, Entregar'
    });
  };

  const pedirConfirmacaoCancelamento = (pedido) => {
    setConfirmacaoAcao({
      tipo: 'cancelar',
      pedido: pedido,
      titulo: 'Cancelar Pedido',
      mensagem: `Tem certeza que deseja cancelar o pedido de ${pedido.clienteNome}? Esta ação não pode ser desfeita.`,
      corBotao: '#ef4444', // Vermelho
      textoBotao: '✖ Sim, Cancelar'
    });
  };

  // Funções REAIS que processam as coisas no banco de dados
  const processarAcaoConfirmada = async () => {
    if (!confirmacaoAcao) return;

    const { tipo, pedido } = confirmacaoAcao;

    if (tipo === 'entregar') {
      try {
        for (const item of pedido.itens) {
          const produtoFisico = produtos.find(p => p.id === item.produtoId);
          if (produtoFisico) {
            const estoqueAtual = produtoFisico.estoque || 0;
            const novoEstoque = Math.max(0, estoqueAtual - item.quantidade);
            await updateDoc(doc(db, "produtos", item.produtoId), { estoque: novoEstoque });
          }
        }
        await updateDoc(doc(db, "pedidos", pedido.id), {
          status: 'entregue',
          dataEntrega: new Date().toISOString()
        });
        mostrarNotificacao("Pedido entregue e estoque atualizado! 🎉");
      } catch (erro) {
        mostrarNotificacao("Erro ao processar a entrega.", "erro");
      }
    } 
    
    else if (tipo === 'cancelar') {
      try {
        await updateDoc(doc(db, "pedidos", pedido.id), {
          status: 'cancelado',
          dataCancelamento: new Date().toISOString()
        });
        mostrarNotificacao("Pedido cancelado com sucesso.");
      } catch (erro) {
        mostrarNotificacao("Erro ao cancelar o pedido.", "erro");
      }
    }

    setConfirmacaoAcao(null); // Fecha a janelinha após concluir
  };
  
  const totalEncomendas = pedidosPendentes.reduce((acc, pedido) => acc + pedido.totalTrufas, 0);

  const relatorioProducao = produtos.map(produto => {
    const encomendadoDesteSabor = pedidosPendentes.reduce((total, pedido) => {
      const itemNoPedido = pedido.itens.find(i => i.produtoId === produto.id);
      return total + (itemNoPedido ? itemNoPedido.quantidade : 0);
    }, 0);

    const estoqueFisico = produto.estoque || 0;
    const faltaProduzir = encomendadoDesteSabor > estoqueFisico ? encomendadoDesteSabor - estoqueFisico : 0;

    return { ...produto, encomendado: encomendadoDesteSabor, faltaProduzir: faltaProduzir };
  });

  relatorioProducao.sort((a, b) => b.faltaProduzir - a.faltaProduzir);

  return (
    <div className="menu-container">
      
      {/* ================= AVISO FLUTUANTE BONITO NO TOPO ================= */}
      {notificacao && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: notificacao.tipo === 'erro' ? '#ef4444' : '#10b981',
          color: 'white', padding: '12px 24px', borderRadius: '30px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 9999,
          fontWeight: 'bold', fontSize: '0.95rem', animation: 'fadeIn 0.3s ease-out'
        }}>
          {notificacao.mensagem}
        </div>
      )}

      <h1 className="header-title">📊 Resumo do Dia</h1>

      {/* DASHBOARD */}
      <div className="dashboard-grid">
        <div className="dash-card">
          <h3>Total Encomendado</h3>
          <p style={{ color: '#8b5cf6' }}>{totalEncomendas} <span style={{fontSize: '1.2rem', color: '#64748b'}}>un.</span></p>
        </div>
        
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h3>Pedidos Pendentes</h3>
          <p style={{ color: '#ec4899', marginBottom: '10px' }}>{pedidosPendentes.length}</p>
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <button className="btn btn-warning" style={{ flex: 1, padding: '8px' }} onClick={() => setIsVerPedidosOpen(true)}>👁️ Ver</button>
            <button className="btn btn-secondary" style={{ flex: 1, padding: '8px', backgroundColor: '#64748b', color: 'white' }} onClick={() => setIsHistoricoOpen(true)}>📜 Histórico</button>
          </div>
        </div>
      </div>

      {/* LISTA: O QUE PRODUZIR */}
      <div className="card">
        <h2 style={{ marginBottom: '15px', color: '#0f172a' }}>O que preciso produzir?</h2>
        
        <div className="lista-cards">
          {relatorioProducao.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Nenhum produto cadastrado para calcular.</div>
          ) : (
            relatorioProducao.map(item => (
              <div className="item-card" key={item.id}>
                <div className="card-header" style={{ paddingBottom: '8px', borderBottom: 'none' }}>
                  <h3 className="card-title" style={{ color: '#1e293b' }}>{item.nome}</h3>
                  {item.faltaProduzir > 0 ? (
                    <span className="status-falta">Falta fazer: {item.faltaProduzir}</span>
                  ) : (
                    <span className="status-ok">Tudo certo ✅</span>
                  )}
                </div>
                
                <div className="card-body" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                  <div className="info-bloco">
                    <span className="label-min">Na Geladeira</span>
                    <strong>{item.estoque} un.</strong>
                  </div>
                  <div className="info-bloco">
                    <span className="label-min">Encomendado</span>
                    <strong>{item.encomendado} un.</strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <button className="fab-button" onClick={() => setIsPedidoModalOpen(true)} title="Nova Encomenda">➕</button>
      <Pedido isOpen={isPedidoModalOpen} onClose={() => setIsPedidoModalOpen(false)} />

      {/* ================= POP-UP 1: PENDENTES ================= */}
      {isVerPedidosOpen && (
        <div className="modal-overlay" onClick={() => setIsVerPedidosOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Pendentes</h2>
              <button className="close-btn" onClick={() => setIsVerPedidosOpen(false)}>✖</button>
            </div>
            
            <div className="lista-cards">
              {pedidosPendentes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhum pedido pendente! 🎉</div>
              ) : (
                pedidosPendentes.map((pedido) => (
                  <div className="item-card border-left-destaque" key={pedido.id}>
                    <div className="card-header">
                      <div>
                        <h3 className="card-title">{pedido.clienteNome}</h3>
                        <div className="card-subtitle">📅 {pedido.dataPedido ? new Date(pedido.dataPedido).toLocaleDateString('pt-BR') : 'Sem data'}</div>
                      </div>
                      <div className="valor-destaque">R$ {(pedido.valorTotal || 0).toFixed(2).replace('.', ',')}</div>
                    </div>
                    
                    <div className="card-body" style={{flexDirection: 'column', alignItems: 'flex-start'}}>
                      <span className="label-min">Itens do Pedido:</span>
                      <ul className="lista-simples">
                        {pedido.itens?.map((item, idx) => (
                          <li key={idx}>{item.nome} x <strong>{item.quantidade}</strong></li>
                        ))}
                      </ul>
                      
                      {/* Trocamos os botões para chamar nossa janelinha personalizada! */}
                      <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '15px' }}>
                        <button className="btn btn-danger" style={{ flex: 1, padding: '10px 5px' }} onClick={() => pedirConfirmacaoCancelamento(pedido)}>
                          ✖ Cancelar
                        </button>
                        <button className="btn btn-success" style={{ flex: 1.5, padding: '10px 5px' }} onClick={() => pedirConfirmacaoEntrega(pedido)}>
                          ✓ Entregar
                        </button>
                      </div>

                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= POP-UP 2: HISTÓRICO ================= */}
      {isHistoricoOpen && (
        <div className="modal-overlay" onClick={() => setIsHistoricoOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📜 Histórico de Entregas</h2>
              <button className="close-btn" onClick={() => setIsHistoricoOpen(false)}>✖</button>
            </div>
            
            <div className="lista-cards">
              {pedidosEntregues.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhum pedido entregue ainda.</div>
              ) : (
                pedidosEntregues.map((pedido) => (
                  <div className="item-card" key={pedido.id} style={{backgroundColor: '#f8fafc'}}>
                    <div className="card-header">
                      <div>
                        <h3 className="card-title">{pedido.clienteNome}</h3>
                        <div className="card-subtitle">Entregue: {pedido.dataEntrega ? new Date(pedido.dataEntrega).toLocaleDateString('pt-BR') : 'Sem data'}</div>
                      </div>
                      <div className="valor-destaque" style={{color: '#2563eb'}}>R$ {(pedido.valorTotal || 0).toFixed(2).replace('.', ',')}</div>
                    </div>
                    <div className="card-body">
                      <ul className="lista-simples" style={{color: '#475569'}}>
                        {pedido.itens?.map((item, idx) => (
                          <li key={idx}>{item.nome} x {item.quantidade} un.</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL BONITO DE CONFIRMAÇÃO ================= */}
      {confirmacaoAcao && (
        <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={() => setConfirmacaoAcao(null)}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '30px 20px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 15px 0', color: '#0f172a' }}>{confirmacaoAcao.titulo}</h2>
            <p style={{ color: '#475569', marginBottom: '25px', lineHeight: '1.5' }}>
              {confirmacaoAcao.mensagem}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmacaoAcao(null)} style={{
                flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                backgroundColor: 'white', color: '#475569', fontWeight: 'bold', cursor: 'pointer'
              }}>
                Voltar
              </button>
              <button onClick={processarAcaoConfirmada} style={{
                flex: 1.5, padding: '12px', borderRadius: '8px', border: 'none',
                backgroundColor: confirmacaoAcao.corBotao, color: 'white', fontWeight: 'bold', cursor: 'pointer'
              }}>
                {confirmacaoAcao.textoBotao}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}