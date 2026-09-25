/**
 * AdminLayout - Layout wrapper for all admin pages.
 * Provides consistent Navbar + main content structure.
 */
import { Navbar } from './Navbar';
import './AdminLayout.css';

interface AdminLayoutProps {
  title: string;
  children: React.ReactNode;
  /**
   * Ensancha el contenedor. Para las páginas con tablas de muchas columnas, donde los
   * 1400px por defecto dejan la columna de nombre apretada y mucho aire a los costados.
   */
  wide?: boolean;
}

export function AdminLayout({ title, children, wide = false }: AdminLayoutProps) {
  return (
    <div className="admin-layout">
      <Navbar title={title} />
      <main className={`admin-main${wide ? ' is-wide' : ''}`}>{children}</main>
    </div>
  );
}
