import React, { useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Leaderboard, useGetGameInfoQuery } from './aoe4OppApi';
import { GameDisplay } from './GameDisplay';
import { PlayerComparison } from './PlayerComparison';
import { getFlagUrl, formatCivName } from './civFlags';

export const PlayerResultsPage: React.FC = () => {
  const { playerId: playerIdParam } = useParams<{ playerId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const playerId = playerIdParam ? parseInt(playerIdParam, 10) : null;

  const leaderboardParam = searchParams.get('leaderboard') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const perPageParam = parseInt(
    searchParams.get('per_page') || searchParams.get('pageSize') || '10',
    10
  );

  const leaderboard = leaderboardParam;
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const perPage = isNaN(perPageParam) || perPageParam < 1 ? 10 : perPageParam;

  const updateUrlParams = (newPage: number, newPerPage: number, newLb: string) => {
    const params = new URLSearchParams();
    if (newLb) params.set('leaderboard', newLb);
    if (newPage > 1) params.set('page', newPage.toString());
    if (newPerPage !== 10) params.set('per_page', newPerPage.toString());
    setSearchParams(params);
  };

  const handleLeaderboardChange = (newLb: string) => {
    updateUrlParams(1, perPage, newLb);
  };

  const handlePerPageChange = (newPerPage: number) => {
    updateUrlParams(1, newPerPage, leaderboard);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    updateUrlParams(newPage, perPage, leaderboard);
  };

  const queryParams =
    playerId !== null && !isNaN(playerId)
      ? {
          playerId,
          page,
          perPage,
          ...(leaderboard ? { leaderboard } : {}),
        }
      : { playerId: 0 };

  const { data: games, error, isFetching } = useGetGameInfoQuery(queryParams, {
    skip: playerId === null || isNaN(playerId),
  });

  const currentPlayer = useMemo(() => {
    if (!games || games.length === 0 || playerId === null) return null;
    for (const game of games) {
      const found =
        game.winningTeam?.players.find((p) => p.profileId === playerId) ??
        game.losingTeams.flatMap((t) => t.players).find((p) => p.profileId === playerId);
      if (found) return found;
    }
    return null;
  }, [games, playerId]);

  const gamertag = currentPlayer?.name || '';
  const civFlagUrl = getFlagUrl(currentPlayer?.civilization);

  return (
    <div style={{ width: '100%', margin: '0 auto', textAlign: 'left' }}>
      <button onClick={() => navigate('/')} style={{ marginBottom: '20px' }}>
        ← Back to Search
      </button>

      {/* Player Header - Gamertag and Profile ID */}
      {playerId !== null && !isNaN(playerId) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '20px 24px',
            backgroundColor: '#1e293b',
            borderRadius: '10px',
            border: '1px solid #334155',
            marginBottom: '24px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '1.85rem', color: '#f8fafc', fontWeight: 700 }}>
                {gamertag ? gamertag : `Player #${playerId}`}
              </h1>
              {civFlagUrl && (
                <img
                  src={civFlagUrl}
                  alt={currentPlayer?.civilization || 'Civ'}
                  title={formatCivName(currentPlayer?.civilization)}
                  style={{
                    width: '32px',
                    height: '32px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    border: '1px solid #475569',
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginTop: '8px',
                fontSize: '0.95rem',
                color: '#94a3b8',
                flexWrap: 'wrap',
              }}
            >
              <span>
                Profile ID: <strong style={{ color: '#f8fafc' }}>{playerId}</strong>
              </span>
              {currentPlayer?.civilization && (
                <span>
                  Recent Civ:{' '}
                  <strong style={{ color: '#38bdf8' }}>
                    {formatCivName(currentPlayer.civilization)}
                  </strong>
                </span>
              )}
              {currentPlayer?.rating !== undefined && currentPlayer.rating > 0 && (
                <span>
                  Rating: <strong style={{ color: '#34d399' }}>{currentPlayer.rating}</strong>
                </span>
              )}
              {currentPlayer?.mmr !== undefined && currentPlayer.mmr > 0 && (
                <span>
                  MMR: <strong style={{ color: '#a78bfa' }}>{currentPlayer.mmr}</strong>
                </span>
              )}
            </div>
          </div>

          <div>
            <a
              href={`https://aoe4world.com/players/${playerId}${gamertag ? `-${encodeURIComponent(gamertag)}` : ''}`}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: '0.85rem',
                color: '#94a3b8',
                textDecoration: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.2s',
              }}
            >
              aoe4world.com ↗
            </a>
          </div>
        </div>
      )}

      {/* Compare Players Section */}
      {playerId !== null && !isNaN(playerId) && (
        <PlayerComparison
          key={playerId}
          currentPlayerId={playerId}
          currentGamerName={gamertag}
          currentCivilization={currentPlayer?.civilization}
          defaultLeaderboard={leaderboard || Leaderboard.RM_SOLO}
        />
      )}

      <h2>Game Results</h2>

      {/* Filter and Pagination Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '15px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          padding: '12px 16px',
          backgroundColor: '#242424',
          borderRadius: '8px',
          border: '1px solid #444',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label htmlFor="leaderboard-select" style={{ fontWeight: '500' }}>
            Leaderboard:
          </label>
          <select
            id="leaderboard-select"
            value={leaderboard}
            onChange={(e) => handleLeaderboardChange(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
            }}
          >
            <option value="">Default (All)</option>
            {Object.values(Leaderboard).map((lb) => (
              <option key={lb} value={lb}>
                {lb}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label htmlFor="per-page-select" style={{ fontWeight: '500' }}>
            Per Page:
          </label>
          <select
            id="per-page-select"
            value={perPage}
            onChange={(e) => handlePerPageChange(parseInt(e.target.value, 10))}
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || isFetching}
            style={{ padding: '6px 12px' }}
          >
            Previous
          </button>
          <span style={{ fontWeight: '500', minWidth: '60px', textAlign: 'center' }}>
            Page {page}
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={isFetching || (games && games.length < perPage)}
            style={{ padding: '6px 12px' }}
          >
            Next
          </button>
        </div>
      </div>

      {isFetching && (
        <div
          style={{
            padding: '20px',
            backgroundColor: '#2c3e50',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '15px',
            border: '1px solid #34495e',
          }}
        >
          <div
            className="loading-spinner"
            style={{
              width: '24px',
              height: '24px',
              border: '3px solid rgba(255,255,255,.3)',
              borderTop: '3px solid #fff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span style={{ fontSize: '1.2em', fontWeight: '500' }}>Fetching match history...</span>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {error && (
        <p style={{ color: 'red' }}>
          Error: {'status' in error ? `Status ${error.status}` : 'Unknown error'}
        </p>
      )}

      {games && playerId !== null && !isNaN(playerId) && (
        <GameDisplay
          key={playerId}
          games={games}
          playerId={playerId}
          page={page}
          leaderboard={leaderboard}
        />
      )}
    </div>
  );
};
