import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  useGetGameAnalysisQuery,
  useAnalyzeMatchupMutation,
  getAoe4WorldGameUrl,
  type PlayerGameAnalysis,
  type PlayerMatchupResult,
  type MatchupAnalysisRequest,
  type MatchupAnalysisResponse,
} from './aoe4OppApi';
import { TimelineChart } from './TimelineChart';
import { PlayerAnalysisDisplay } from './PlayerAnalysisDisplay';
import { DEFAULT_PLAYER_COLORS } from './timelineConstants';
import { getFlagUrl } from './civFlags';

const formatDuration = (seconds: number): string => {
  if (!seconds) return 'N/A';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
};

interface ToastNotification {
  id: number;
  message: string;
  type: 'success' | 'error';
}

const getPlayerKey = (player: PlayerGameAnalysis, idx: number): string =>
  player.profileId || player.name || String(idx);

export const GameOverviewPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [analyzeMatchup, { data: mutationAnalysisData, isLoading: isAnalyzing }] =
    useAnalyzeMatchupMutation();
  const [analysisData, setAnalysisData] = useState<MatchupAnalysisResponse | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const activeAnalysis = analysisData || mutationAnalysisData;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const {
    data: gameAnalysis,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetGameAnalysisQuery(gameId || '', {
    skip: !gameId,
  });

  const [hiddenPlayerKeys, setHiddenPlayerKeys] = useState<Set<string>>(new Set());

  const players = useMemo(() => {
    const list = gameAnalysis?.players ?? [];
    return [...list].sort((a, b) => {
      const getRank = (res?: string | null) => {
        if (!res) return 2;
        const lower = res.trim().toLowerCase();
        if (lower === 'win' || lower === 'won' || lower === 'victory') return 0;
        if (lower === 'loss' || lower === 'lost' || lower === 'defeat') return 1;
        return 2;
      };
      return getRank(a.result) - getRank(b.result);
    });
  }, [gameAnalysis?.players]);

  const durationSeconds = gameAnalysis?.durationSeconds ?? 0;
  const mapName = gameAnalysis?.mapName;
  const leaderboard = gameAnalysis?.leaderboard || searchParams.get('leaderboard') || '';
  const currentGameId = gameAnalysis?.gameId || gameId || '';
  const aoe4WorldUrl = getAoe4WorldGameUrl(currentGameId, players[0]);

  const handleAnalyzePlayers = async () => {
    if (players.length === 0 || isAnalyzing) return;

    const currentLeaderboard = gameAnalysis?.leaderboard || searchParams.get('leaderboard') || 'rm_solo';
    const requestPayload: MatchupAnalysisRequest = {
      players: players.map((p) => ({
        profileId: String(p.profileId || ''),
        gamerName: p.name || '',
        civilization: p.civilization || '',
        leaderboard: currentLeaderboard,
      })),
    };

    try {
      const response = await analyzeMatchup(requestPayload).unwrap();
      setAnalysisData(response);
      showToast('Player analysis completed', 'success');
    } catch (err: unknown) {
      console.error('Matchup analysis error:', err);
      showToast('Failed to complete player analysis', 'error');
    }
  };

  const gamePlayerAnalysisResults: PlayerMatchupResult[] = useMemo(() => {
    if (!gameAnalysis?.players || gameAnalysis.players.length === 0) return [];
    return gameAnalysis.players.map((p) => ({
      profileId: p.profileId || '',
      gamerName: p.name || '',
      civilization: p.civilization || '',
      gameIds: [gameAnalysis.gameId || gameId || ''],
      summary: {
        averageApm: p.apm,
        ageUpTimings: p.ageUpTimings,
        villagerProduction: p.villagerProduction,
        traderProduction: p.traderProduction,
        militaryProduction: p.militaryProduction,
        additionalTownCenters: p.additionalTownCenters,
        landmarks: p.landmarks,
        gamesAnalyzed: 1,
      },
    }));
  }, [gameAnalysis, gameId]);

  const playerColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    players.forEach((p, idx) => {
      const color = DEFAULT_PLAYER_COLORS[idx % DEFAULT_PLAYER_COLORS.length];
      const key = getPlayerKey(p, idx);
      map[key] = color;
      if (p.profileId) map[String(p.profileId)] = color;
      if (p.name) map[p.name] = color;
    });
    return map;
  }, [players]);

  const handleTogglePlayer = (playerKey: string) => {
    setHiddenPlayerKeys((prev) => {
      const next = new Set(prev);
      if (next.has(playerKey)) {
        next.delete(playerKey);
      } else {
        next.add(playerKey);
      }
      return next;
    });
  };

  const handleShowAll = () => {
    setHiddenPlayerKeys(new Set());
  };

  const hasTimelineData = players.some((p) => p.dataPoints && p.dataPoints.length > 0);

  return (
    <div style={{ width: '100%', margin: '0 auto', textAlign: 'left' }}>
      {/* Navigation & Title Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '20px',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#334155',
              color: '#f8fafc',
              border: '1px solid #475569',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.9em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ← Back
          </button>
          <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '1.6em' }}>
            Game Overview
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleAnalyzePlayers}
            disabled={isAnalyzing || players.length === 0}
            style={{
              padding: '6px 14px',
              backgroundColor: isAnalyzing ? '#1e293b' : '#2563eb',
              color: '#ffffff',
              border: '1px solid #3b82f6',
              borderRadius: '6px',
              cursor: isAnalyzing || players.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.85em',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: isAnalyzing || players.length === 0 ? 0.7 : 1,
              transition: 'all 0.2s',
            }}
            title="Analyze player matchups for this match"
          >
            {isAnalyzing ? (
              <>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid rgba(255,255,255,.3)',
                    borderTop: '2px solid #ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                Analyzing...
              </>
            ) : (
              'Analyze Players'
            )}
          </button>
          {currentGameId && (
            <a
              href={aoe4WorldUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '6px 14px',
                backgroundColor: '#1e293b',
                color: '#93c5fd',
                border: '1px solid #334155',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.85em',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.2s',
              }}
              title="Open match page on aoe4world.com"
            >
              aoe4world.com ↗
            </a>
          )}
          <button
            onClick={() => refetch()}
            style={{
              padding: '6px 14px',
              backgroundColor: '#1e293b',
              color: '#94a3b8',
              border: '1px solid #334155',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85em',
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Loading State */}
      {(isLoading || isFetching) && (
        <div
          style={{
            padding: '24px',
            backgroundColor: '#1e293b',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '15px',
            border: '1px solid #334155',
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              border: '3px solid rgba(255,255,255,.2)',
              borderTop: '3px solid #60a5fa',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span style={{ fontSize: '1.1em', fontWeight: '500', color: '#e2e8f0' }}>
            Loading game analysis...
          </span>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#7f1d1d22',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            marginBottom: '20px',
            color: '#fca5a5',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Failed to load game analysis</div>
          <div style={{ fontSize: '0.9em' }}>
            {'status' in error
              ? `API Error (Status ${error.status})`
              : 'error' in error
              ? String(error.error)
              : 'Unknown error occurred'}
          </div>
        </div>
      )}

      {/* Main Content */}
      {gameAnalysis && (
        <>
          {/* Match Info Summary Card */}
          <div
            style={{
              backgroundColor: '#1e293b',
              borderRadius: '8px',
              padding: '18px 20px',
              marginBottom: '24px',
              border: '1px solid #334155',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.85em', color: '#94a3b8' }}>Leaderboard</div>
              <div style={{ fontSize: '1.1em', fontWeight: 600, color: '#f8fafc' }}>
                {leaderboard || 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.85em', color: '#94a3b8' }}>Map</div>
              <div style={{ fontSize: '1.1em', fontWeight: 600, color: '#f8fafc' }}>
                {mapName || 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.85em', color: '#94a3b8' }}>Game ID</div>
              <div style={{ fontSize: '1.1em', fontWeight: 600, color: '#f8fafc' }}>
                <a
                  href={aoe4WorldUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#60a5fa', textDecoration: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                  title="View on aoe4world.com"
                >
                  {gameAnalysis.gameId || gameId} ↗
                </a>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.85em', color: '#94a3b8' }}>Match Duration</div>
              <div style={{ fontSize: '1.1em', fontWeight: 600, color: '#f8fafc' }}>
                {formatDuration(durationSeconds)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.85em', color: '#94a3b8' }}>Players</div>
              <div style={{ fontSize: '1.1em', fontWeight: 600, color: '#f8fafc' }}>
                {players.length} {players.length === 1 ? 'Player' : 'Players'}
              </div>
            </div>
          </div>

          {/* Players Roster Card */}
          <div
            style={{
              backgroundColor: '#1e293b',
              borderRadius: '8px',
              padding: '18px 20px',
              marginBottom: '24px',
              border: '1px solid #334155',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                marginBottom: '14px',
                gap: '8px',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1em', color: '#f8fafc' }}>
                  Players &amp; Civilizations
                </h3>
                <div style={{ fontSize: '0.8em', color: '#94a3b8', marginTop: '2px' }}>
                  Click a player card or chart legend above to toggle their visibility on the charts
                </div>
              </div>

              {hiddenPlayerKeys.size > 0 && (
                <button
                  type="button"
                  onClick={handleShowAll}
                  style={{
                    padding: '4px 10px',
                    backgroundColor: '#334155',
                    color: '#93c5fd',
                    border: '1px solid #475569',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '0.8em',
                    fontWeight: 500,
                  }}
                >
                  Show All Players ({players.length})
                </button>
              )}
            </div>

            <div className="roster-grid">
              {players.map((player, idx) => {
                const color = DEFAULT_PLAYER_COLORS[idx % DEFAULT_PLAYER_COLORS.length];
                const playerKey = getPlayerKey(player, idx);
                const isHidden = hiddenPlayerKeys.has(playerKey);
                const flagUrl = getFlagUrl(player.civilization ?? undefined);
                const isWin = player.result?.toLowerCase() === 'win';
                const isLoss = player.result?.toLowerCase() === 'loss';

                return (
                  <div
                    key={playerKey}
                    onClick={() => handleTogglePlayer(playerKey)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isHidden ? 'rgba(15, 23, 42, 0.45)' : '#0f172a',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      border: `1px solid ${isHidden ? '#334155' : `${color}55`}`,
                      borderLeft: `4px solid ${isHidden ? '#475569' : color}`,
                      cursor: 'pointer',
                      opacity: isHidden ? 0.55 : 1,
                      transition: 'all 0.15s ease',
                      userSelect: 'none',
                    }}
                    title={`Click to ${isHidden ? 'show' : 'hide'} ${player.name || `Player ${idx + 1}`} on timeline charts`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <img
                        src={flagUrl}
                        alt={player.civilization || 'Civ'}
                        title={player.civilization ?? undefined}
                        style={{
                          width: '22px',
                          height: '22px',
                          objectFit: 'cover',
                          borderRadius: '3px',
                          flexShrink: 0,
                          filter: isHidden ? 'grayscale(80%)' : 'none',
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '0.95em',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textDecoration: isHidden ? 'line-through' : 'none',
                          }}
                        >
                          {player.profileId ? (
                            <Link
                              to={`/player/${player.profileId}`}
                              onClick={(e) => e.stopPropagation()}
                              style={{ color: isHidden ? '#94a3b8' : '#f8fafc', textDecoration: 'none' }}
                              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                            >
                              {player.name || `Player ${idx + 1}`}
                            </Link>
                          ) : (
                            <span style={{ color: isHidden ? '#94a3b8' : '#f8fafc' }}>
                              {player.name || `Player ${idx + 1}`}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8em', color: '#94a3b8', textTransform: 'capitalize' }}>
                          {player.civilization || 'Unknown Civ'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {player.apm !== undefined && player.apm !== null && (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75em',
                            fontWeight: 600,
                            backgroundColor: '#0284c722',
                            border: '1px solid #0284c755',
                            color: '#38bdf8',
                          }}
                          title="Actions Per Minute (APM)"
                        >
                          {player.apm} APM
                        </span>
                      )}

                      {player.result && (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75em',
                            fontWeight: 600,
                            backgroundColor: isWin ? '#166534' : isLoss ? '#991b1b' : '#334155',
                            color: isWin ? '#bbf7d0' : isLoss ? '#fecaca' : '#cbd5e1',
                            textTransform: 'uppercase',
                          }}
                        >
                          {player.result}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Loading Indicator for Matchup Analysis */}
          {isAnalyzing && (
            <div
              style={{
                backgroundColor: '#0f172a',
                borderRadius: '12px',
                border: '1px solid #334155',
                padding: '24px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                color: '#93c5fd',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  border: '3px solid rgba(255,255,255,.2)',
                  borderTop: '3px solid #60a5fa',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <span style={{ fontSize: '1em', fontWeight: 500 }}>
                Aggregating match insights and strategic metrics across player games...
              </span>
            </div>
          )}

          {/* Match Historical Analysis or Game Strategic Analysis */}
          {activeAnalysis?.results && activeAnalysis.results.length > 0 ? (
            <PlayerAnalysisDisplay
              results={activeAnalysis.results}
              playerColors={playerColorMap}
              title="Historical Matchup Analysis"
              subtitle="Aggregated strategic metrics across analyzed player matches"
              onClose={() => setAnalysisData(null)}
            />
          ) : gamePlayerAnalysisResults.length > 0 ? (
            <PlayerAnalysisDisplay
              results={gamePlayerAnalysisResults}
              playerColors={playerColorMap}
              title="Game Strategic Analysis"
              subtitle="In-depth analysis of age-up timings, villager/military production, town centers, and landmarks for this match"
            />
          ) : null}

          {/* Timeline Charts: 1. Villagers, 2. Military in Responsive Grid (if timeline data points exist) */}
          {hasTimelineData && (
            <div className="charts-grid">
              <TimelineChart
                title="Villagers Over Time"
                metricKey="villagerCount"
                players={players}
                durationSeconds={durationSeconds}
                playerColors={DEFAULT_PLAYER_COLORS}
                hiddenPlayerKeys={hiddenPlayerKeys}
                onTogglePlayer={handleTogglePlayer}
              />

              <TimelineChart
                title="Military Count Over Time"
                metricKey="militaryCount"
                players={players}
                durationSeconds={durationSeconds}
                playerColors={DEFAULT_PLAYER_COLORS}
                hiddenPlayerKeys={hiddenPlayerKeys}
                onTogglePlayer={handleTogglePlayer}
              />
            </div>
          )}
        </>
      )}

      {/* Toast notifications container */}
      {toasts.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxWidth: '380px',
          }}
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '12px 18px',
                borderRadius: '8px',
                backgroundColor: toast.type === 'success' ? '#14532d' : '#7f1d1d',
                color: toast.type === 'success' ? '#86efac' : '#fca5a5',
                border: `1px solid ${toast.type === 'success' ? '#22c55e' : '#ef4444'}`,
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.3)',
                fontSize: '0.95em',
                fontWeight: 500,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
                <span>{toast.message}</span>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontSize: '1.1em',
                  padding: 0,
                  lineHeight: 1,
                  opacity: 0.8,
                }}
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
