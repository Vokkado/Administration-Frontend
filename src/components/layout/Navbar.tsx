/**
 * Navbar Component - Barra de navegación reutilizable
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { Button } from '../ui';
import vokkadoIcon from '../../../assets/images/icon.png';
import './Navbar.css';

interface NavbarProps {
  title?: string;
}

export function Navbar({ title = '' }: NavbarProps) {
  const { session, signOut } = useAuthContext();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const groupsLabel = session?.user?.groups?.length
    ? session.user.groups.join(', ')
    : 'Sin grupo';

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/login');
  };

  const handleBrandClick = () => {
    navigate('/dashboard');
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-brand" onClick={handleBrandClick}>
          <img src={vokkadoIcon} alt="Vokkado" className="navbar-logo" />
          <h1>{title}</h1>
        </div>

        {/* Hamburger button — mobile only */}
        <button
          className="navbar-hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menú"
          type="button"
        >
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
        </button>

        {/* Desktop: always visible | Mobile: toggle with hamburger */}
        <div className={`navbar-user ${menuOpen ? 'navbar-user--open' : ''}`}>
          <div className="user-badge">
            <span className="user-email">{session?.user?.email || 'Cargando...'}</span>
          </div>
          <div className="user-badge">
            <span className="user-email">Grupo: {groupsLabel}</span>
          </div>
          <Button variant="outline" size="small" onClick={handleSignOut}>
            Cerrar Sesión
          </Button>
        </div>
      </div>

      {/* Overlay to close menu on tap outside */}
      {menuOpen && (
        <div className="navbar-overlay" onClick={() => setMenuOpen(false)} />
      )}
    </nav>
  );
}
