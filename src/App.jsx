import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Menu from './pages/Menu';
import Clientes from './pages/Clientes';
import Produtos from './pages/Produtos';
import Gerencia from './pages/Gerencia';
import Catalogo from './pages/Catalogo';
import Loja from './pages/Loja';
import Login from './pages/Login'; // 👈 Importação da nova tela de Login
import './App.css';
import GerenciaBot from './components/GerenciaBot'; 
import RotaProtegida from './components/RotaProtegida'; // 👈 Importação do Cadeado

// ================= IMPORTS PARA A MÁGICA OFFLINE =================
import { db as dbLocal } from './db'; // Nosso banco offline (Dexie)
import { db } from './firebase'; // Nosso banco nas nuvens (Firebase)
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
// =================================================================

// Componente que decide se mostra o menu ou não
function AppContent() {
  const location = useLocation();
  
  // 👇 Verifica se é uma tela pública (Loja ou Login). 
  // Nessas telas a barra lateral da administração ficará escondida.
  const isTelaPublica = ['/', '/loja', '/login'].includes(location.pathname);

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
              for (const item of venda.itens) {
                const produtoRef = doc(db, "produtos", item.produtoId);
                const produtoSnap = await getDoc(produtoRef); 
                if (produtoSnap.exists()) {
                  const estoqueAtual = produtoSnap.data().estoque || 0;
                  const novoEstoque = Math.max(0, estoqueAtual - item.quantidade);
                  await updateDoc(produtoRef, { estoque: novoEstoque });
                }
              }
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

    window.addEventListener('online', sincronizarComServidor);
    if (navigator.onLine) {
      sincronizarComServidor();
    }
    return () => window.removeEventListener('online', sincronizarComServidor);
  }, []);
  // =========================================================================

  // Função para abrir e fechar a Sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // 👇 RENDERIZAÇÃO DAS ROTAS PÚBLICAS
  // Se for a Loja ou o Login, não renderiza o Layout da administração
  if (isTelaPublica) {
    return (
      <Routes>
        <Route path="/" element={<Loja />} />
        <Route path="/loja" element={<Loja />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  // 👇 RENDERIZAÇÃO DAS ROTAS PROTEGIDAS (Visão da Patroa)
  return (
    <div className="app-layout">
      {/* Botão Hambúrguer - Fica no topo para abrir o menu no telemóvel */}
      <button className="menu-hamburger" onClick={toggleSidebar}>
        ☰ Menu
      </button>

      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar}></div>
      )}

      <div className={`sidebar-container ${isSidebarOpen ? 'open' : ''}`}>
        <Sidebar onClose={closeSidebar} />
      </div>

      <main className="content-area">
        <Routes>
          {/* Todas as telas da administração agora exigem a RotaProtegida */}
          <Route path="/menu" element={<RotaProtegida><Menu /></RotaProtegida>} />
          <Route path="/clientes" element={<RotaProtegida><Clientes /></RotaProtegida>} />
          <Route path="/produtos" element={<RotaProtegida><Produtos /></RotaProtegida>} />
          <Route path="/catalogo" element={<RotaProtegida><Catalogo /></RotaProtegida>} />
          <Route path="/gerencia" element={<RotaProtegida><Gerencia /></RotaProtegida>} />
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