import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { RoundResponse, RoundWithResultsResponse } from '../types/api';
import gussReady from '../assets/guss_ready.png';
import gussStop from '../assets/guss_stop.png';
import gussTapped from '../assets/guss_tapped.png';
import './RoundPage.css';

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
}

const RoundPage: React.FC = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const user = apiService.decodeToken();
  const [roundData, setRoundData] = useState<
    RoundResponse | RoundWithResultsResponse | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isTapping, setIsTapping] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [needsFinishReload, setNeedsFinishReload] = useState(false);

  const fetchRoundData = async () => {
    if (!uuid) return;

    try {
      setLoading(true);
      const data = await apiService.getRound(uuid);
      setRoundData(data);
      setMyScore(data.currentUserScore ?? 0);
      setNeedsFinishReload(new Date(data.round.end_datetime) > new Date());
    } catch (err) {
      setError('Ошибка загрузки данных раунда');
      console.error('Error fetching round data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchRoundData();
  }, [uuid]);

  useEffect(() => {
    if (!roundData || !needsFinishReload) return;
    const isFinished = currentTime > new Date(roundData.round.end_datetime);
    if (isFinished) {
      setNeedsFinishReload(false);
      fetchRoundData();
    }
  }, [currentTime, needsFinishReload, roundData]);

  const handleTap = async () => {
    if (!roundData || isTapping || !uuid) return;

    try {
      setIsTapping(true);
      const response = await apiService.tap(uuid);
      setMyScore(response.score);
    } catch (err) {
      console.error('Error performing tap:', err);
    } finally {
      setTimeout(() => setIsTapping(false), 80);
    }
  };

  if (loading && !roundData) {
    return (
      <div className="round-page">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  if (error || !roundData) {
    return (
      <div className="round-page">
        <div className="error">{error || 'Раунд не найден'}</div>
        <button onClick={() => navigate('/')} className="back-button">
          Вернуться к списку раундов
        </button>
      </div>
    );
  }

  const { round } = roundData;
  const startTime = new Date(round.start_datetime);
  const endTime = new Date(round.end_datetime);

  const isBeforeStart = currentTime < startTime;
  const isActive = currentTime >= startTime && currentTime <= endTime;
  const isFinished = currentTime > endTime;

  const headerTitle = isBeforeStart
    ? 'Cooldown'
    : isActive
      ? 'Раунды'
      : 'Раунд завершен';

  const getCurrentImage = () => {
    if (isTapping) return gussTapped;
    if (isActive) return gussReady;
    return gussStop;
  };

  return (
    <div className="round-page mockup">
      <header className="round-topbar">
        <button onClick={() => navigate('/')} className="back-button">
          ← Раунды
        </button>
        <h1>{headerTitle}</h1>
        <span className="player-name">{user?.username ?? ''}</span>
      </header>

      <div className="guss-container">
        <img
          src={getCurrentImage()}
          alt="Guss"
          className={`guss-image ${isActive ? 'clickable' : ''} ${isTapping ? 'tapping' : ''}`}
          onClick={isActive ? handleTap : undefined}
          draggable={false}
        />
      </div>

      <div className="round-status-block">
        {isBeforeStart && (
          <>
            <h2>Cooldown</h2>
            <p>до начала раунда {formatCountdown(startTime.getTime() - currentTime.getTime())}</p>
          </>
        )}

        {isActive && (
          <>
            <h2>Раунд активен!</h2>
            <p>До конца осталось: {formatCountdown(endTime.getTime() - currentTime.getTime())}</p>
            <p>Мои очки - {myScore}</p>
          </>
        )}

        {isFinished && 'totalScore' in roundData && (
          <div className="finished-stats">
            <div className="stats-row">
              <span>Всего</span>
              <span>{roundData.totalScore}</span>
            </div>
            <div className="stats-row">
              <span>
                Победитель - {roundData.bestPlayer?.username ?? '—'}
              </span>
              <span>{roundData.bestPlayer?.score ?? 0}</span>
            </div>
            <div className="stats-row">
              <span>Мои очки</span>
              <span>{roundData.currentUserScore ?? myScore}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoundPage;
