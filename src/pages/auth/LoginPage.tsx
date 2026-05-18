/**
 * Página de Login para Administradores
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { Button, Input } from '../../components/ui';
import { IoEye, IoEyeOff } from 'react-icons/io5';
import vokkadoIcon from '../../../assets/images/icon.png';
import './LoginPage.css';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { signIn } = useAuthContext();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn(email, password);

      if (result.success) { 
        navigate('/dashboard');
      } else {
        setError(result.error || 'Error al iniciar sesión');
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-decorations">
        <div className="decoration-circle circle-1"></div>
        <div className="decoration-circle circle-2"></div>
        <div className="decoration-circle circle-3"></div>
      </div>

      <div className="login-container">
        <div className="login-header">
          <img src={vokkadoIcon} alt="Vokkado" className="login-logo" />
          <h1>Vokkado</h1>
          <p>Panel de Administración</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <Input
            type="email"
            label="Email"
            placeholder="admin@vokkado.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoComplete="email"
          />

          <Input
            type={showPassword ? "text" : "password"}
            label="Contraseña"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            autoComplete="current-password"
            icon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
                tabIndex={-1}
              >
                {showPassword ? <IoEyeOff size={20} /> : <IoEye size={20} />}
              </button>
            }
          />

          {error && (
            <div className="login-error">
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="large"
            fullWidth
            loading={loading}
          >
            Iniciar Sesión
          </Button>
        </form>

        <div className="login-footer">
          <p>👤 Solo pueden acceder administradores</p>
        </div>
      </div>
    </div>
  );
}
