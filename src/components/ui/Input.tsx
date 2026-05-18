/**
 * Componente Input
 */

import { type InputHTMLAttributes } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export function Input({
  label,
  error,
  fullWidth = false,
  className = '',
  icon,
  ...props
}: InputProps) {
  const classes = ['input-wrapper', fullWidth && 'input-fullwidth', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {label && <label className="input-label">{label}</label>}
      <div className="input-container">
        <input
          className={`input ${error ? 'input-error' : ''}`}
          {...props}
        />
        {icon && <div className="input-icon">{icon}</div>}
      </div>
      {error && <span className="input-error-message">{error}</span>}
    </div>
  );
}
