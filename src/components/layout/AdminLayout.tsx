/**
 * AdminLayout - Layout wrapper for all admin pages.
 * Provides consistent Navbar + main content structure.
 */
import { Navbar } from './Navbar';
import './AdminLayout.css';

interface AdminLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function AdminLayout({ title, children }: AdminLayoutProps) {
  return (
    <div className="admin-layout">
      <Navbar title={title} />
      <main className="admin-main">{children}</main>
    </div>
  );
}
