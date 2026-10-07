import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { Round } from '../types/api';

function getLifecycleStatus(round: Round, now: Date): string {
  const start = new Date(round.start_datetime);
  const end = new Date(round.end_datetime);
  if (now < start) return 'Cooldown';
  if (now > end) return 'Finished';
  return 'Активен';
}

export const HomePage: React.FC = () => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creatingRound, setCreatingRound] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const navigate = useNavigate();
  const user = apiService.decodeToken();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let initialFetch = true;
    const fetchRounds = async () => {
      try {
        setRounds((prev) => {
          initialFetch = prev.length === 0;
          return prev;
        });
        setLoading(initialFetch);
        const roundsData = await apiService.getRounds();
        setRounds(roundsData);
      } catch (err) {
        setError('Ошибка загрузки раундов');
        if (err instanceof Error && err.message.includes('Authentication')) {
          apiService.removeToken();
          navigate('/auth');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRounds();
    const interval = setInterval(fetchRounds, 3000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    apiService.removeToken();
    navigate('/auth');
  };

  const handleCreateRound = async () => {
    try {
      setCreatingRound(true);
      setError('');
      const round = await apiService.createRound();
      navigate(`/round/${round.uuid}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания раунда');
    } finally {
      setCreatingRound(false);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('ru-RU');
  };

  if (loading) {
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
        <div style={{ textAlign: 'center', fontSize: '1.2rem', color: '#666' }}>
          Загрузка раундов...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        padding: '1.5rem',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            border: '1px solid #333',
            backgroundColor: 'white',
            padding: '0.75rem 1rem',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Список РАУНДОВ</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>{user?.username ?? ''}</span>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.35rem 0.75rem',
                backgroundColor: 'white',
                border: '1px solid #333',
                cursor: 'pointer',
              }}
            >
              Выйти
            </button>
          </div>
        </header>

        {apiService.isAdmin() && (
          <div style={{ marginBottom: '1rem' }}>
            <button
              onClick={handleCreateRound}
              disabled={creatingRound}
              style={{
                padding: '0.6rem 1rem',
                backgroundColor: 'white',
                border: '1px solid #333',
                cursor: creatingRound ? 'not-allowed' : 'pointer',
              }}
            >
              {creatingRound ? 'Создание...' : 'Создать раунд'}
            </button>
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              border: '1px solid #c00',
              color: '#721c24',
              backgroundColor: '#f8d7da',
            }}
          >
            {error}
          </div>
        )}

        {rounds.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            Раунды не найдены
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {rounds.map((round) => {
              const status = getLifecycleStatus(round, now);
              return (
                <div
                  key={round.uuid}
                  onClick={() => navigate(`/round/${round.uuid}`)}
                  style={{
                    border: '1px solid #333',
                    backgroundColor: 'white',
                    padding: '1rem',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ marginBottom: '0.75rem' }}>
                    ● Round ID:{' '}
                    <span style={{ textDecoration: 'underline' }}>
                      {round.uuid}
                    </span>
                  </div>
                  <div>Start: {formatDate(round.start_datetime)}</div>
                  <div>End: {formatDate(round.end_datetime)}</div>
                  <hr style={{ margin: '0.75rem 0', borderColor: '#999' }} />
                  <div>Статус: {status}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
