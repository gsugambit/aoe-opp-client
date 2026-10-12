import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Leaderboard,
  type GameResult,
  type MatchupAnalysisRequest,
  type MatchupAnalysisResponse,
  type ResultTeam,
  useAnalyzeMatchupMutation,
  useLazyGetGameSummaryQuery,
  useLazyScrapeGameSummaryQuery,
} from './aoe4OppApi';
import { getFlagUrl } from './civFlags';
import { PlayerAnalysisDisplay } from './PlayerAnalysisDisplay';

interface GameDisplayProps {
  games: GameResult[];
  playerId: number;
  page?: number;
  leaderboard?: Leaderboard | string;
}

const DEFAULT_PLAYER_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#eab308', // yellow
  '#10b981', // green
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
];

const formatErrorMessage = (err: unknown): string => {
  if (!err) return 'Unknown error occurred';
  if (typeof err === 'string') return err;
  if (typeof err === 'object') {
    const errorObj = err as Record<string, unknown>;
    if (typeof errorObj.data === 'string') return errorObj.data;
    if (errorObj.data && typeof errorObj.data === 'object') {
      const dataObj = errorObj.data as Record<string, unknown>;
      if (typeof dataObj.message === 'string') return dataObj.message;
      if (typeof dataObj.error === 'string') return dataObj.error;
    }
    if (typeof errorObj.error === 'string') return errorObj.error;
    if (typeof errorObj.message === 'string') return errorObj.message;
    if (errorObj.status) return `Request failed with status ${errorObj.status}`;
  }
  return 'Failed to scrape game summary';
};

export const GameDisplay: React.FC<GameDisplayProps> = ({
  games,
  playerId,
  page = 1,
  leaderboard = Leaderboard.RM_SOLO,
}) => {
  const navigate = useNavigate();
  const [triggerGetGameSummary] = useLazyGetGameSummaryQuery();
  const [triggerScrapeGameSummary] = useLazyScrapeGameSummaryQuery();
  const [analyzeMatchup] = useAnalyzeMatchupMutation();

  const [loadingGameId, setLoadingGameId] = useState<number | null>(null);
  const [analyzingGameId, setAnalyzingGameId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedGameForAnalysis, setFailedGameForAnalysis] = useState<GameResult | null>(null);

  const [analysisData, setAnalysisData] = useState<MatchupAnalysisResponse | null>(null);
  const [analyzedGame, setAnalyzedGame] = useState<GameResult | null>(null);
  const [toasts, setToasts] = useState<
    Array<{ id: string; message: string; type: 'success' | 'error' }>
  >([]);

  const analysisSectionRef = useRef<HTMLDivElement | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleAnalyzeGame = async (game: GameResult, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (analyzingGameId !== null) return;

    setAnalyzingGameId(game.gameId);
    const resolvedLeaderboard =
      typeof leaderboard === 'string' && leaderboard ? leaderboard : Leaderboard.RM_SOLO;

    const allPlayers = [
      ...(game.winningTeam?.players || []),
      ...game.losingTeams.flatMap((t) => t.players),
    ];

    const requestPayload: MatchupAnalysisRequest = {
      players: allPlayers.map((p) => ({
        profileId: String(p.profileId),
        gamerName: p.name,
        civilization: p.civilization,
        leaderboard: resolvedLeaderboard,
      })),
    };

    try {
      const response = await analyzeMatchup(requestPayload).unwrap();
      setAnalysisData(response);
      setAnalyzedGame(game);
      showToast('playher analysis completed', 'success');
      setTimeout(() => {
        analysisSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: unknown) {
      console.error('Matchup analysis error:', err);
      showToast('Failed to complete player analysis', 'error');
    } finally {
      setAnalyzingGameId(null);
    }
  };

  const handleRowClick = async (game: GameResult) => {
    if (loadingGameId !== null) return;

    setErrorMessage(null);
    setFailedGameForAnalysis(null);
    setLoadingGameId(game.gameId);

    const currentPlayer =
      game.winningTeam?.players.find((p) => p.profileId === playerId) ??
      game.losingTeams.flatMap((t) => t.players).find((p) => p.profileId === playerId);
    const gamerName = currentPlayer?.name ?? '';

    try {
      // 1. Check if the game was previously saved
      try {
        await triggerGetGameSummary(game.gameId).unwrap();
        // Game exists in database, proceed directly to Game Overview page
        navigate(`/game/${game.gameId}`);
        return;
      } catch (checkErr: unknown) {
        // If not found (404), scrape is required
        const isNotFound =
          typeof checkErr === 'object' &&
          checkErr !== null &&
          ('status' in checkErr ? (checkErr as { status: unknown }).status === 404 : false);

        if (!isNotFound) {
          console.warn('Game summary lookup returned non-404 error, attempting scrape as fallback...', checkErr);
        }
      }

      // 2. Scrape the game summary since it wasn't saved yet
      await triggerScrapeGameSummary({
        profileId: playerId,
        gamerName,
        gameId: game.gameId,
        leaderboard: leaderboard || Leaderboard.RM_SOLO,
        page: page || 1,
      }).unwrap();

      // 3. Scrape succeeded, navigate to Game Overview page
      navigate(`/game/${game.gameId}`);
    } catch (scrapeErr: unknown) {
      const details = formatErrorMessage(scrapeErr);
      setErrorMessage(`Failed to load game summary for Game #${game.gameId}: ${details}`);
      setFailedGameForAnalysis(game);
    } finally {
      setLoadingGameId(null);
    }
  };

  const playerColorMap = useMemo(() => {
    if (!analyzedGame) return {};
    const map: Record<string, string> = {};
    const allPlayers = [
      ...(analyzedGame.winningTeam?.players || []),
      ...analyzedGame.losingTeams.flatMap((t) => t.players),
    ];
    allPlayers.forEach((p, idx) => {
      const color = DEFAULT_PLAYER_COLORS[idx % DEFAULT_PLAYER_COLORS.length];
      if (p.profileId) map[String(p.profileId)] = color;
      if (p.name) map[p.name] = color;
    });
    return map;
  }, [analyzedGame]);

  const renderTeam = (team: ResultTeam, status: 'Win' | 'Loss' | 'Draw') => {
    const statusColor = status === 'Win' ? '#4caf50' : status === 'Loss' ? '#f44336' : '#ff9800';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontWeight: 'bold', color: statusColor }}>
          {status}
        </div>
        {team.players.map((p) => {
          const flagUrl = getFlagUrl(p.civilization);
          return (
            <div key={p.profileId} style={{ fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Civilization flag */}
              <img
                src={flagUrl}
                alt={p.civilization}
                title={p.civilization}
                style={{ width: '18px', height: '18px', objectFit: 'cover', borderRadius: '2px' }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              {/* Player link */}
              <Link
                to={`/player/${p.profileId}`}
                onClick={(e) => e.stopPropagation()}
                style={{ textDecoration: 'none', color: '#646cff', fontWeight: '500' }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                {p.name}
              </Link>
              <span style={{ color: '#888' }}>
                [{p.rating}]
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>Recent Games</h3>
        {loadingGameId !== null && (
          <span style={{ color: '#60a5fa', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                border: '2px solid rgba(96,165,250,0.3)',
                borderTop: '2px solid #60a5fa',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            Checking / Scraping game data...
          </span>
        )}
      </div>

      {errorMessage && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '16px',
            backgroundColor: '#7f1d1d',
            border: '1px solid #ef4444',
            borderRadius: '6px',
            color: '#fee2e2',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{errorMessage}</span>
            <button
              onClick={() => {
                setErrorMessage(null);
                setFailedGameForAnalysis(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#fca5a5',
                cursor: 'pointer',
                fontSize: '1.2em',
                padding: '0 4px',
                lineHeight: 1,
              }}
              title="Dismiss error"
            >
              ✕
            </button>
          </div>
          {failedGameForAnalysis && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(239, 68, 68, 0.4)',
              }}
            >
              <span style={{ fontSize: '0.9em', color: '#fecaca' }}>
                This match may be in progress or unrecorded. You can still analyze historical player profiles and tendencies:
              </span>
              <button
                onClick={() => handleAnalyzeGame(failedGameForAnalysis)}
                disabled={analyzingGameId === failedGameForAnalysis.gameId}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.85em',
                  fontWeight: 600,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: '1px solid #3b82f6',
                  borderRadius: '6px',
                  cursor: analyzingGameId === failedGameForAnalysis.gameId ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {analyzingGameId === failedGameForAnalysis.gameId ? (
                  'Analyzing...'
                ) : (
                  <>
                    <span>⚡</span> Analyze Players (Historical Data)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Inline Player Matchup Analysis Display */}
      {analysisData && (
        <div
          ref={analysisSectionRef}
          style={{
            marginBottom: '24px',
            padding: '20px',
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            border: '1px solid #334155',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid #334155',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.25em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📊</span> Historical Player & Matchup Analysis
              </h3>
              {analyzedGame && (
                <div style={{ fontSize: '0.85em', color: '#94a3b8', marginTop: '4px' }}>
                  Game #{analyzedGame.gameId} &bull; {analyzedGame.map} &bull; {analyzedGame.matchType}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setAnalysisData(null);
                setAnalyzedGame(null);
              }}
              style={{
                padding: '6px 14px',
                fontSize: '0.85em',
                backgroundColor: '#334155',
                color: '#f8fafc',
                border: '1px solid #475569',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              ✕ Close Analysis
            </button>
          </div>

          <PlayerAnalysisDisplay
            results={analysisData.results}
            playerColors={playerColorMap}
            onClose={() => {
              setAnalysisData(null);
              setAnalyzedGame(null);
            }}
          />
        </div>
      )}

      {games.length === 0 ? (
        <p>No games found for this player.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #555' }}>
              <th style={{ padding: '8px' }}>Info</th>
              <th style={{ padding: '8px' }}>Your Team</th>
              <th style={{ padding: '8px' }}></th>
              <th style={{ padding: '8px' }}>Opponent</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => {
              const playerInWinningTeam = game.winningTeam?.players.some(
                (p) => p.profileId === playerId
              );
              const playerInLosingTeam = game.losingTeams.some((team) =>
                team.players.some((p) => p.profileId === playerId)
              );

              let yourTeam: ResultTeam;
              let opponentTeam: ResultTeam;
              let yourStatus: 'Win' | 'Loss' | 'Draw';
              let opponentStatus: 'Win' | 'Loss' | 'Draw';

              const hasWinner = game.winningTeam !== null && game.winningTeam !== undefined;

              if (hasWinner) {
                if (playerInWinningTeam) {
                  yourTeam = game.winningTeam!;
                  opponentTeam = game.losingTeams[0] || ({ players: [] } as ResultTeam);
                  yourStatus = 'Win';
                  opponentStatus = 'Loss';
                } else if (playerInLosingTeam) {
                  yourTeam =
                    game.losingTeams.find((t) =>
                      t.players.some((p) => p.profileId === playerId)
                    ) ?? game.losingTeams[0];
                  opponentTeam = game.winningTeam!;
                  yourStatus = 'Loss';
                  opponentStatus = 'Win';
                } else {
                  yourTeam = game.winningTeam!;
                  opponentTeam = game.losingTeams[0] || ({ players: [] } as ResultTeam);
                  yourStatus = 'Win';
                  opponentStatus = 'Loss';
                }
              } else {
                yourTeam =
                  game.losingTeams.find((t) =>
                    t.players.some((p) => p.profileId === playerId)
                  ) ?? game.losingTeams[0];
                opponentTeam =
                  game.losingTeams.find((t) => t !== yourTeam) ??
                  (game.losingTeams.length > 1
                    ? game.losingTeams[1]
                    : ({ players: [] } as ResultTeam));
                yourStatus = 'Draw';
                opponentStatus = 'Draw';
              }

              const isCurrentGameLoading = loadingGameId === game.gameId;
              const isCurrentGameAnalyzing = analyzingGameId === game.gameId;

              return (
                <tr
                  key={game.gameId}
                  onClick={() => handleRowClick(game)}
                  style={{
                    borderBottom: '1px solid #444',
                    cursor: loadingGameId !== null ? 'wait' : 'pointer',
                    backgroundColor: isCurrentGameLoading || isCurrentGameAnalyzing ? '#1e293b' : 'transparent',
                    opacity: loadingGameId !== null && !isCurrentGameLoading ? 0.6 : 1,
                    transition: 'background-color 0.15s ease, opacity 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (loadingGameId === null && !isCurrentGameAnalyzing) {
                      e.currentTarget.style.backgroundColor = '#1e293b';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrentGameLoading && !isCurrentGameAnalyzing) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  title="Click to view Game Overview & Timeline Metrics"
                >
                  <td style={{ padding: '12px 8px', fontSize: '0.85em', color: '#ccc' }}>
                    <div>{new Date(game.startedAt).toLocaleDateString()}</div>
                    <div style={{ fontStyle: 'italic' }}>{game.map}</div>
                    <div style={{ fontSize: '0.8em', opacity: 0.8 }}>{game.matchType}</div>
                    {isCurrentGameLoading && (
                      <div style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '0.8em', marginTop: '4px' }}>
                        Loading / Scraping...
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    {renderTeam(yourTeam, yourStatus)}
                  </td>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold', fontSize: '1.2em', color: '#888' }}>
                    VS
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    {renderTeam(opponentTeam, opponentStatus)}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <button
                      onClick={(e) => handleAnalyzeGame(game, e)}
                      disabled={isCurrentGameAnalyzing || loadingGameId !== null}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.85em',
                        fontWeight: 600,
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: '1px solid #3b82f6',
                        borderRadius: '6px',
                        cursor: isCurrentGameAnalyzing ? 'wait' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                      }}
                      title="Analyze historical player tendencies and strategies for all players in this match"
                    >
                      {isCurrentGameAnalyzing ? (
                        <>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '12px',
                              height: '12px',
                              border: '2px solid rgba(255,255,255,0.3)',
                              borderTop: '2px solid #ffffff',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite',
                            }}
                          />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <span>⚡</span> Analyze Matchup
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Floating Toast Notification */}
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
