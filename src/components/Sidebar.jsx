import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();
  
  // Função para deixar o menu selecionado mais escuro
  const isActive = (path) => location.pathname === path ? 'active-link' : '';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Trufas App 🍫</h2>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li><Link className={isActive('/')} to="/">📊 Menu Inicial</Link></li>
          <li><Link className={isActive('/clientes')} to="/clientes">👥 Clientes</Link></li>
          <li><Link className={isActive('/produtos')} to="/produtos">📦 Estoque</Link></li>
          <li><Link className={isActive('/catalogo')} to="/catalogo">📖 Meu Catálogo</Link></li>
          <li><Link className={isActive('/gerencia')} to="/gerencia">⚙️ Gerência</Link></li>
        </ul>
      </nav>
    </aside>
  );
}