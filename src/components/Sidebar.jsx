import { Link, useLocation } from 'react-router-dom';

export default function Sidebar({ onClose }) {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path ? 'active-link' : '';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Trufas App 🍫</h2>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {/* 👇 CORREÇÃO: Apontando para "/menu" ao invés de "/" */}
          <li><Link className={isActive('/menu')} to="/menu" onClick={onClose}>📊 Menu Inicial</Link></li>
          <li><Link className={isActive('/clientes')} to="/clientes" onClick={onClose}>👥 Clientes</Link></li>
          <li><Link className={isActive('/produtos')} to="/produtos" onClick={onClose}>📦 Estoque</Link></li>
          <li><Link className={isActive('/catalogo')} to="/catalogo" onClick={onClose}>📖 Meu Catálogo</Link></li>
          <li><Link className={isActive('/gerencia')} to="/gerencia" onClick={onClose}>⚙️ Gerência</Link></li>
        </ul>
      </nav>
    </aside>
  );
}