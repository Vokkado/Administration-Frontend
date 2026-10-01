/**
 * AdminLayout - Layout wrapper for all admin pages.
 * Provides consistent Navbar + main content structure.
 */
import { Navbar } from './Navbar';
import './AdminLayout.css';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="admin-layout">
      <Navbar />
      <main className="admin-main">{children}</main>
    </div>
  );
}
