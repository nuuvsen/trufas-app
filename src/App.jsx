import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Menu from './pages/Menu';
import Clientes from './pages/Clientes';
import Produtos from './pages/Produtos';
import Gerencia from './pages/Gerencia';
import Catalogo from './pages/Catalogo';
import Loja from './pages/Loja';
import './App.css';

// ================= IMPORTS PARA A MÁGICA OFFLINE =================
import { db as dbLocal } from './db'; // Nosso banco offline (Dexie)
import { db } from './firebase'; // Nosso banco nas nuvens (Firebase)
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
// =================================================================

// Componente que decide se mostra o menu ou não
function AppContent() {
  const location = useLocation();
  const isTelaDoCliente = location.pathname === '/loja';

  // Estado que controla se a Sidebar está aberta ou fechada no telemóvel
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ================= O GUARDIÃO DA INTERNET (SINCRONIZAÇÃO) =================
  useEffect(() => {
    const sincronizarComServidor = async () => {
      try {
        // 1. Pega tudo que está 'pendente' no banco do celular
        const vendasPendentes = await dbLocal.vendas
          .where('statusSincronizacao')
          .equals('pendente')
          .toArray();

        if (vendasPendentes.length > 0) {
          console.log("Temos internet! Sincronizando coisas offline...", vendasPendentes);

          // 2. Passa por cada ação pendente e envia pro Firebase
          for (let venda of vendasPendentes) {
            
            // --- SE FOR UMA ENTREGA ---
            if (venda.acao === 'entregar') {
              // Abate o estoque de cada item do pedido
              for (const item of venda.itens) {
                const produtoRef = doc(db, "produtos", item.produtoId);
                const produtoSnap = await getDoc(produtoRef); // Lê o estoque atual
                if (produtoSnap.exists()) {
                  const estoqueAtual = produtoSnap.data().estoque || 0;
                  const novoEstoque = Math.max(0, estoqueAtual - item.quantidade);
                  await updateDoc(produtoRef, { estoque: novoEstoque });
                }
              }
              // Atualiza o status do pedido
              await updateDoc(doc(db, "pedidos", venda.pedidoId), {
                status: 'entregue',
                dataEntrega: new Date().toISOString()
              });
            } 
            
            // --- SE FOR UM CANCELAMENTO ---
            else if (venda.acao === 'cancelar') {
              await updateDoc(doc(db, "pedidos", venda.pedidoId), {
                status: 'cancelado',
                dataCancelamento: new Date().toISOString()
              });
            } 
            
            // --- SE FOR UM NOVO PEDIDO ---
            else if (venda.acao === 'novo_pedido') {
              let clienteId = venda.clienteSelecionado;
              let clienteNome = '';

              // Cria ou atualiza o cliente primeiro
              if (clienteId === 'novo') {
                const docRef = await addDoc(collection(db, "clientes"), {
                  nome: venda.novoClienteNome,
                  telefone: venda.novoClienteTelefone || 'Não informado',
                  trufasCompradas: venda.totalTrufasNoPedido,
                  dataCadastro: new Date().toISOString()
                });
                clienteId = docRef.id;
                clienteNome = venda.novoClienteNome;
              } else {
                const clienteRef = doc(db, "clientes", clienteId);
                const clienteSnap = await getDoc(clienteRef);
                if (clienteSnap.exists()) {
                  clienteNome = clienteSnap.data().nome;
                  const trufasAntigas = clienteSnap.data().trufasCompradas || 0;
                  await updateDoc(clienteRef, {
                    trufasCompradas: trufasAntigas + venda.totalTrufasNoPedido
                  });
                }
              }

              // Salva o pedido no banco
              await addDoc(collection(db, "pedidos"), {
                clienteId,
                clienteNome,
                itens: venda.carrinho,
                totalTrufas: venda.totalTrufasNoPedido,
                valorTotal: venda.valorTotalPedido,
                status: 'pendente',
                dataPedido: venda.dataPedido
              });
            }

            // 3. Deu tudo certo com essa venda? Marca como concluído no celular!
            await dbLocal.vendas.update(venda.id, { statusSincronizacao: 'concluido' });
          }

          alert("✨ Uhul! Suas vendas feitas offline foram sincronizadas com sucesso!");
        }
      } catch (error) {
        console.error("Erro na sincronização:", error);
      }
    };

    // Dizemos ao navegador: "Se a internet voltar, rode a sincronização"
    window.addEventListener('online', sincronizarComServidor);

    // Quando o app abre, tenta sincronizar caso tenha internet
    if (navigator.onLine) {
      sincronizarComServidor();
    }

    // Limpeza para não criar eventos duplicados
    return () => window.removeEventListener('online', sincronizarComServidor);
  }, []);
  // =========================================================================

  // Função para abrir e fechar a Sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Função para fechar a Sidebar ao clicar num link (opcional, mas recomendado)
  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Se for a tela do cliente, mostra só a Loja (sem a barra lateral)
  if (isTelaDoCliente) {
    return (
      <Routes>
        <Route path="/loja" element={<Loja />} />
      </Routes>
    );
  }

  // Visão da Patroa (Com Sidebar responsiva)
  return (
    <div className="app-layout">
      {/* Botão Hambúrguer - Fica no topo para abrir o menu no telemóvel */}
      <button className="menu-hamburger" onClick={toggleSidebar}>
        ☰ Menu
      </button>

      {/* Fundo escuro (overlay) quando o menu está aberto no celular. 
          Clicar fora da barra também a fecha! */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar}></div>
      )}

      {/* A nossa Sidebar, que ganha a classe 'open' quando clicamos no botão */}
      <div className={`sidebar-container ${isSidebarOpen ? 'open' : ''}`}>
        <Sidebar onClose={closeSidebar} />
      </div>

      <main className="content-area">
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/gerencia" element={<Gerencia />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}