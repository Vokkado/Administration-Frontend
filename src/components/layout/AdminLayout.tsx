/**
 * AdminLayout - Layout wrapper for all admin pages.
 * Provides consistent Navbar + main content structure.
 */
import { Navbar } from './Navbar';
import './AdminLayout.css';

interface AdminLayoutProps {
  className?: string;
  children: React.ReactNode;
}

export function AdminLayout({ className, children }: AdminLayoutProps) {
  return (
    <div className={className ? `admin-layout ${className}` : 'admin-layout'}>
      <Navbar />
      <main className="admin-main">{children}</main>
    </div>
  );
}
