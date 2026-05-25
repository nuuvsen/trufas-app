import { Link, useLocation } from 'react-router-dom';

// Adicionamos o { onClose } aqui em cima para receber a função do App.jsx
export default function Sidebar({ onClose }) {
  const location = useLocation();
  
  // Função para deixar o menu selecionado com a classe 'active-link'
  const isActive = (path) => location.pathname === path ? 'active-link' : '';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Trufas App 🍫</h2>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {/* Adicionamos o onClick={onClose} em cada Link para fechar no celular */}
          <li><Link className={isActive('/')} to="/" onClick={onClose}>📊 Menu Inicial</Link></li>
          <li><Link className={isActive('/clientes')} to="/clientes" onClick={onClose}>👥 Clientes</Link></li>
          <li><Link className={isActive('/produtos')} to="/produtos" onClick={onClose}>📦 Estoque</Link></li>
          <li><Link className={isActive('/catalogo')} to="/catalogo" onClick={onClose}>📖 Meu Catálogo</Link></li>
          <li><Link className={isActive('/gerencia')} to="/gerencia" onClick={onClose}>⚙️ Gerência</Link></li>
        </ul>
      </nav>
    </aside>
  );
}