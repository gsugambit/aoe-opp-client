import { Routes, Route, Link, useMatch } from 'react-router-dom'
import aoeoppLogo from './assets/aoe4-opp.jpg'
import './App.css'
import { DashboardPage } from './features/aoe4-opp/DashboardPage'
import { PlayerResultsPage } from './features/aoe4-opp/PlayerResultsPage'
import { GameOverviewPage } from './features/aoe4-opp/GameOverviewPage'
import { useGetTimelineMetricsQuery, getAoe4WorldGameUrl } from './features/aoe4-opp/aoe4OppApi'

function AppHeader() {
  const matchGame = useMatch('/game/:gameId');
  const matchGameOverview = useMatch('/game-overview/:gameId');
  const matchGames = useMatch('/games/:gameId');
  const gameMatch = matchGame || matchGameOverview || matchGames;
  const playerMatch = useMatch('/player/:playerId');
  const gameId = gameMatch?.params.gameId;
  const playerId = playerMatch?.params.playerId;

  const { data: timelineMetrics } = useGetTimelineMetricsQuery(gameId || '', {
    skip: !gameId,
  });

  const aoe4worldUrl = (() => {
    if (gameId) {
      const player = timelineMetrics?.players?.[0];
      return getAoe4WorldGameUrl(gameId, player);
    }
    if (playerId) {
      return `https://aoe4world.com/players/${playerId}`;
    }
    return 'https://aoe4world.com';
  })();

  return (
    <header className="app-header">
      <Link to="/" className="app-brand">
        <img src={aoeoppLogo} className="app-logo" alt="AOE4Opp logo" />
        <h1 className="app-title">AOE4 Opp Info</h1>
      </Link>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <a
          href={aoe4worldUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: '0.85rem',
            color: '#94a3b8',
            textDecoration: 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            transition: 'background-color 0.2s',
          }}
          title={gameId ? `View Game #${gameId} on aoe4world.com` : 'Visit aoe4world.com'}
        >
          aoe4world.com ↗
        </a>
      </div>
    </header>
  );
}

function App() {
  return (
    <>
      <AppHeader />
      <main>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/player/:playerId" element={<PlayerResultsPage />} />
          <Route path="/game/:gameId" element={<GameOverviewPage />} />
          <Route path="/game-overview/:gameId" element={<GameOverviewPage />} />
          <Route path="/games/:gameId" element={<GameOverviewPage />} />
        </Routes>
      </main>
    </>
  );
}

export default App
