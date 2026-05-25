import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Menu from './pages/Menu';
import Clientes from './pages/Clientes';
import Produtos from './pages/Produtos';
import Gerencia from './pages/Gerencia';
import Catalogo from './pages/Catalogo';
import Loja from './pages/Loja';
import './App.css';

// Componente que decide se mostra o menu ou não
function AppContent() {
  const location = useLocation();
  const isTelaDoCliente = location.pathname === '/loja';

  // Estado que controla se a Sidebar está aberta ou fechada no telemóvel
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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