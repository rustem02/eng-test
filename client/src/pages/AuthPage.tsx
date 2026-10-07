import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

export const AuthPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiService.auth({ username, password });
      apiService.setToken(response.access_token);
      navigate('/');
    } catch {
      setError('Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          border: '1px solid #333',
          width: '100%',
          maxWidth: '420px',
        }}
      >
        <div
          style={{
            borderBottom: '1px solid #333',
            padding: '0.75rem 1rem',
            textAlign: 'center',
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          ВОЙТИ
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem 1.25rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Имя пользователя:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.6rem',
                border: '1px solid #333',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Пароль:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.6rem',
                border: '1px solid #333',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.7rem',
              backgroundColor: 'white',
              color: '#111',
              border: '1px solid #333',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>

          {error && (
            <div
              style={{
                color: '#d32f2f',
                marginTop: '0.75rem',
                textAlign: 'center',
                fontSize: '0.9rem',
              }}
            >
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
