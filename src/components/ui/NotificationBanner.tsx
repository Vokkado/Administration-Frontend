/**
 * Componente NotificationBanner
 * Banners de éxito y error reutilizables
 */

import './NotificationBanner.css';

interface NotificationBannerProps {
  type: 'success' | 'error';
  message: string;
}

export function NotificationBanner({ type, message }: NotificationBannerProps) {
  if (!message) return null;

  return (
    <div className={`notification-banner notification-banner-${type}`}>
      {type === 'error' && '⚠️ '}{message}
    </div>
  );
}
