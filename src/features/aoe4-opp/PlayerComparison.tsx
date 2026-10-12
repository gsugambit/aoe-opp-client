import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Leaderboard,
  useSearchPlayersQuery,
  useGetCivilizationsQuery,
  useAnalyzeMatchupMutation,
  type SearchPlayer,
  type MatchupAnalysisResponse,
  type MatchupPlayer,
  type CivilizationOption,
} from './aoe4OppApi';
import { PlayerAnalysisDisplay } from './PlayerAnalysisDisplay';
import { getFlagUrl, formatCivName, DEFAULT_CIVILIZATIONS } from './civFlags';

interface PlayerComparisonProps {
  currentPlayerId: number;
  currentGamerName?: string;
  currentCivilization?: string;
  defaultLeaderboard?: string;
}

const LEADERBOARD_LABELS: Record<string, string> = {
  [Leaderboard.RM_SOLO]: 'Ranked 1v1 (rm_solo)',
  [Leaderboard.RM_TEAM]: 'Ranked Team (rm_team)',
  [Leaderboard.QM_1V1]: 'Quick 1v1 (qm_1v1)',
  [Leaderboard.QM_2V2]: 'Quick 2v2 (qm_2v2)',
  [Leaderboard.QM_3V3]: 'Quick 3v3 (qm_3v3)',
  [Leaderboard.QM_4V4]: 'Quick 4v4 (qm_4v4)',
};

export const PlayerComparison: React.FC<PlayerComparisonProps> = ({
  currentPlayerId,
  currentGamerName = '',
  currentCivilization = '',
  defaultLeaderboard = Leaderboard.RM_SOLO,
}) => {
  // Civilizations list from API or fallback
  const { data: apiCivilizations, isLoading: isLoadingCivs } = useGetCivilizationsQuery();

  const civilizationList: CivilizationOption[] = useMemo(() => {
    if (apiCivilizations && apiCivilizations.length > 0) {
      return apiCivilizations;
    }
    return DEFAULT_CIVILIZATIONS.map((civ) => ({
      value: civ,
      displayName: formatCivName(civ),
    }));
  }, [apiCivilizations]);

  const defaultCiv = currentCivilization || civilizationList[0]?.value || 'english';

  // Player 1 state (Current player)
  const [player1CustomName, setPlayer1CustomName] = useState<string | null>(null);
  const [player1CustomCiv, setPlayer1CustomCiv] = useState<string | null>(null);
  const [player1CustomLeaderboard, setPlayer1CustomLeaderboard] = useState<string | null>(null);

  const player1Name = player1CustomName ?? currentGamerName;
  const player1Civ = player1CustomCiv ?? defaultCiv;
  const player1Leaderboard = player1CustomLeaderboard ?? (defaultLeaderboard || Leaderboard.RM_SOLO);

  // Player 2 state (Opponent / Compared player)
  const [player2SearchTerm, setPlayer2SearchTerm] = useState<string>('');
  const [player2DebouncedSearch, setPlayer2DebouncedSearch] = useState<string>('');
  const [player2Selected, setPlayer2Selected] = useState<SearchPlayer | null>(null);
  const [player2ProfileId, setPlayer2ProfileId] = useState<string>('');
  const [player2Name, setPlayer2Name] = useState<string>('');
  const [player2CustomCiv, setPlayer2CustomCiv] = useState<string | null>(null);
  const [player2CustomLeaderboard, setPlayer2CustomLeaderboard] = useState<string | null>(null);
  const player2Civ = player2CustomCiv ?? defaultCiv;
  const player2Leaderboard = player2CustomLeaderboard ?? (defaultLeaderboard || Leaderboard.RM_SOLO);

  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Analysis result state
  const [analyzeMatchup, { isLoading: isAnalyzing }] = useAnalyzeMatchupMutation();
  const [analysisResult, setAnalysisResult] = useState<MatchupAnalysisResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const analysisResultRef = useRef<HTMLDivElement>(null);

  // Debounce player 2 search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setPlayer2DebouncedSearch(player2SearchTerm.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [player2SearchTerm]);

  // Player 2 search query
  const { data: searchResults, isFetching: isSearching } = useSearchPlayersQuery(
    {
      gamertag: player2DebouncedSearch,
      leaderboard: player2Leaderboard || Leaderboard.RM_SOLO,
    },
    {
      skip: player2DebouncedSearch.length < 2,
    }
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPlayer2 = (player: SearchPlayer) => {
    setPlayer2Selected(player);
    setPlayer2ProfileId(String(player.profileId));
    setPlayer2Name(player.name);
    setPlayer2SearchTerm(player.name);
    setShowDropdown(false);
    setErrorMessage(null);
  };

  const handleClearPlayer2 = () => {
    setPlayer2Selected(null);
    setPlayer2ProfileId('');
    setPlayer2Name('');
    setPlayer2SearchTerm('');
    setShowDropdown(false);
  };

  const handleCompare = async () => {
    setErrorMessage(null);

    const resolvedP1Name = player1Name.trim() || currentGamerName.trim() || `Player #${currentPlayerId}`;
    const resolvedP1Id = currentPlayerId;
    const resolvedP1Civ = player1Civ;
    const resolvedP1Lb = player1Leaderboard || Leaderboard.RM_SOLO;

    const resolvedP2Id = player2ProfileId.trim() || (player2Selected ? String(player2Selected.profileId) : '');
    const resolvedP2Name = player2Name.trim() || (player2Selected ? player2Selected.name : player2SearchTerm.trim());
    const resolvedP2Civ = player2Civ;
    const resolvedP2Lb = player2Leaderboard || Leaderboard.RM_SOLO;

    if (!resolvedP2Id && !resolvedP2Name) {
      setErrorMessage('Please search and select an opponent player to compare with.');
      return;
    }

    if (!resolvedP1Civ) {
      setErrorMessage('Please select a civilization for Player 1.');
      return;
    }

    if (!resolvedP2Civ) {
      setErrorMessage('Please select a civilization for Player 2.');
      return;
    }

    const player1: MatchupPlayer = {
      profileId: String(resolvedP1Id),
      gamerName: resolvedP1Name,
      civilization: resolvedP1Civ,
      leaderboard: resolvedP1Lb,
    };

    const player2: MatchupPlayer = {
      profileId: resolvedP2Id || resolvedP2Name,
      gamerName: resolvedP2Name || `Player #${resolvedP2Id}`,
      civilization: resolvedP2Civ,
      leaderboard: resolvedP2Lb,
    };

    try {
      const response = await analyzeMatchup({ players: [player1, player2] }).unwrap();
      setAnalysisResult(response);
      setTimeout(() => {
        analysisResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: unknown) {
      console.error('Matchup analysis failed:', err);
      let detail = 'Failed to analyze matchup';
      if (err && typeof err === 'object') {
        const errObj = err as Record<string, unknown>;
        const data = errObj.data as Record<string, unknown> | undefined;
        if (data && typeof data.message === 'string') {
          detail = data.message;
        } else if (data && typeof data.error === 'string') {
          detail = data.error;
        } else if ('status' in errObj) {
          detail = `Error ${errObj.status}`;
        }
      }
      setErrorMessage(detail);
    }
  };

  const playerColors = useMemo(() => {
    if (!analysisResult) return {};
    const map: Record<string, string> = {};
    analysisResult.results.forEach((p, idx) => {
      const key = `${p.profileId || ''}-${p.gamerName || ''}-${idx}`;
      map[key] = idx === 0 ? '#38bdf8' : '#f87171';
    });
    return map;
  }, [analysisResult]);

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        borderRadius: '10px',
        border: '1px solid #334155',
        padding: '24px',
        marginBottom: '28px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
      }}
    >
      <div style={{ marginBottom: '20px' }}>
        <h3
          style={{
            margin: '0 0 6px 0',
            fontSize: '1.3rem',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>⚔️</span> Compare Player Matchups
        </h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>
          Compare performance and strategic stats against another player. Search for an opponent,
          select civilization and leaderboard for both players, and analyze the matchup.
        </p>
      </div>

      {/* Comparison Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '20px',
        }}
      >
        {/* Player 1 Box (Current Player) */}
        <div
          style={{
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            border: '1px solid #2563eb',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #1e293b',
              paddingBottom: '8px',
            }}
          >
            <span style={{ fontWeight: 600, color: '#60a5fa', fontSize: '0.95rem' }}>
              Player 1 (You)
            </span>
            <span
              style={{
                fontSize: '0.8rem',
                backgroundColor: '#1e3a8a',
                color: '#bfdbfe',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              ID: {currentPlayerId}
            </span>
          </div>

          <div>
            <label
              htmlFor="p1-name"
              style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}
            >
              Gamertag
            </label>
            <input
              id="p1-name"
              type="text"
              value={player1Name}
              onChange={(e) => setPlayer1CustomName(e.target.value)}
              placeholder="Your Gamertag"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="p1-civ"
              style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}
            >
              Civilization {isLoadingCivs && '(loading...)'}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {player1Civ && (
                <img
                  src={getFlagUrl(player1Civ)}
                  alt={player1Civ}
                  title={formatCivName(player1Civ)}
                  style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '3px' }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <select
                id="p1-civ"
                value={player1Civ}
                onChange={(e) => setPlayer1CustomCiv(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                }}
              >
                {civilizationList.map((civ) => (
                  <option key={civ.value} value={civ.value}>
                    {civ.displayName || formatCivName(civ.value)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="p1-lb"
              style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}
            >
              Leaderboard / Rank
            </label>
            <select
              id="p1-lb"
              value={player1Leaderboard}
              onChange={(e) => setPlayer1CustomLeaderboard(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                boxSizing: 'border-box',
              }}
            >
              {Object.values(Leaderboard).map((lb) => (
                <option key={lb} value={lb}>
                  {LEADERBOARD_LABELS[lb] || lb}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Player 2 Box (Opponent with Autocomplete) */}
        <div
          style={{
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            border: '1px solid #dc2626',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #1e293b',
              paddingBottom: '8px',
            }}
          >
            <span style={{ fontWeight: 600, color: '#f87171', fontSize: '0.95rem' }}>
              Player 2 (Opponent)
            </span>
            {player2Selected && (
              <span
                style={{
                  fontSize: '0.8rem',
                  backgroundColor: '#7f1d1d',
                  color: '#fecaca',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                ID: {player2Selected.profileId}
              </span>
            )}
          </div>

          {/* Autocomplete Search */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <label
              htmlFor="p2-search"
              style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}
            >
              Search Opponent Gamertag
            </label>
            <div style={{ display: 'flex', gap: '6px', position: 'relative' }}>
              <input
                id="p2-search"
                type="text"
                value={player2SearchTerm}
                onChange={(e) => {
                  setPlayer2SearchTerm(e.target.value);
                  setPlayer2Name(e.target.value);
                  setShowDropdown(true);
                  if (player2Selected && e.target.value !== player2Selected.name) {
                    setPlayer2Selected(null);
                  }
                }}
                onFocus={() => {
                  if (searchResults?.players && searchResults.players.length > 0) {
                    setShowDropdown(true);
                  }
                }}
                placeholder="Type player name to search..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#1e293b',
                  color: '#f8fafc',
                  border: `1px solid ${player2Selected ? '#10b981' : '#334155'}`,
                  boxSizing: 'border-box',
                }}
              />
              {player2SearchTerm && (
                <button
                  type="button"
                  onClick={handleClearPlayer2}
                  style={{
                    padding: '0 10px',
                    backgroundColor: '#334155',
                    color: '#94a3b8',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                  title="Clear opponent"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown Menu */}
            {showDropdown && searchResults?.players && searchResults.players.length > 0 && (
              <ul
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  listStyle: 'none',
                  padding: '4px 0',
                  margin: '4px 0 0 0',
                  maxHeight: '240px',
                  overflowY: 'auto',
                  zIndex: 100,
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                }}
              >
                {searchResults.players.map((player) => (
                  <li
                    key={player.profileId}
                    onClick={() => handleSelectPlayer2(player)}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #334155',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>
                        {player.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        ID: {player.profileId} {player.country ? `• ${player.country.toUpperCase()}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                      <div style={{ color: '#38bdf8', fontWeight: 600 }}>
                        {player.rating ? `${player.rating} ELO` : `#${player.rank || 'N/A'}`}
                      </div>
                      {player.winRate !== undefined && (
                        <div style={{ color: '#10b981', fontSize: '0.75rem' }}>
                          {player.winRate}% Win
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {isSearching && (
              <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '4px' }}>
                Searching players...
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="p2-civ"
              style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}
            >
              Civilization {isLoadingCivs && '(loading...)'}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {player2Civ && (
                <img
                  src={getFlagUrl(player2Civ)}
                  alt={player2Civ}
                  title={formatCivName(player2Civ)}
                  style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '3px' }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <select
                id="p2-civ"
                value={player2Civ}
                onChange={(e) => setPlayer2CustomCiv(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                }}
              >
                {civilizationList.map((civ) => (
                  <option key={civ.value} value={civ.value}>
                    {civ.displayName || formatCivName(civ.value)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="p2-lb"
              style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}
            >
              Leaderboard / Rank
            </label>
            <select
              id="p2-lb"
              value={player2Leaderboard}
              onChange={(e) => setPlayer2CustomLeaderboard(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                boxSizing: 'border-box',
              }}
            >
              {Object.values(Leaderboard).map((lb) => (
                <option key={lb} value={lb}>
                  {LEADERBOARD_LABELS[lb] || lb}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error notification */}
      {errorMessage && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#7f1d1d',
            border: '1px solid #b91c1c',
            borderRadius: '6px',
            color: '#fecaca',
            fontSize: '0.85rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>⚠ {errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fecaca',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Action button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={handleCompare}
          disabled={isAnalyzing}
          style={{
            padding: '10px 24px',
            backgroundColor: isAnalyzing ? '#475569' : '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background-color 0.2s',
          }}
        >
          {isAnalyzing ? (
            <>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid #fff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              Analyzing Matchup...
            </>
          ) : (
            <>
              <span>⚡</span> Compare Matchup
            </>
          )}
        </button>

        {analysisResult && (
          <button
            onClick={() => setAnalysisResult(null)}
            style={{
              padding: '10px 16px',
              backgroundColor: '#334155',
              color: '#cbd5e1',
              border: '1px solid #475569',
              borderRadius: '6px',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Hide Comparison
          </button>
        )}
      </div>

      {/* Analysis Results */}
      {analysisResult && (
        <div ref={analysisResultRef} style={{ marginTop: '24px' }}>
          <PlayerAnalysisDisplay
            results={analysisResult.results}
            playerColors={playerColors}
            title="Matchup Analysis Results"
            subtitle={`${player1Name || 'Player 1'} (${formatCivName(player1Civ)}) vs ${
              player2Name || player2Selected?.name || 'Player 2'
            } (${formatCivName(player2Civ)})`}
            onClose={() => setAnalysisResult(null)}
          />
        </div>
      )}
    </div>
  );
};
