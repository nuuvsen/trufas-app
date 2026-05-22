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

  // Se for a tela do cliente, mostra só a Loja (sem a barra lateral)
  if (isTelaDoCliente) {
    return (
      <Routes>
        <Route path="/loja" element={<Loja />} />
      </Routes>
    );
  }

  // Se for a visão da Patroa, mostra a barra lateral normal
  return (
    <div className="app-layout">
      <Sidebar />
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