import React, { useState } from 'react';
import {
  type PlayerMatchupResult,
  type PlayerSummary,
  type MilitaryUnitSummary,
  type LandmarkSummary,
} from './aoe4OppApi';
import { getFlagUrl } from './civFlags';

interface PlayerAnalysisDisplayProps {
  results: PlayerMatchupResult[];
  playerColors?: Record<string, string>;
  title?: string;
  subtitle?: string;
  onClose?: () => void;
}

const formatSeconds = (seconds?: number | null): string => {
  if (seconds === undefined || seconds === null || isNaN(seconds) || seconds <= 0) {
    return 'N/A';
  }
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s.toString().padStart(2, '0')}s`;
};

const formatCivName = (civ?: string): string => {
  if (!civ) return 'Unknown Civ';
  return civ
    .split(/[-_ ]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatUnitName = (unit?: string): string => {
  if (!unit) return '';
  return unit
    .split(/[-_ ]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

const getTargetAgeLabel = (age?: number | null): string => {
  if (age === 2) return 'Age II (Feudal)';
  if (age === 3) return 'Age III (Castle)';
  if (age === 4) return 'Age IV (Imperial)';
  if (age) return `Age ${age}`;
  return 'Landmark';
};

export const PlayerAnalysisDisplay: React.FC<PlayerAnalysisDisplayProps> = ({
  results,
  playerColors = {},
  title = 'Historical Matchup Analysis',
  subtitle = 'Aggregated strategic metrics across analyzed player matches',
  onClose,
}) => {
  const [selectedPlayerKey, setSelectedPlayerKey] = useState<string>('all');

  if (!results || results.length === 0) {
    return null;
  }

  const getPlayerKey = (p: PlayerMatchupResult, idx: number) =>
    p.profileId ? `${p.profileId}` : `${p.gamerName || idx}`;

  const displayedResults =
    selectedPlayerKey === 'all'
      ? results
      : results.filter((p, idx) => getPlayerKey(p, idx) === selectedPlayerKey);

  return (
    <section
      aria-label="Player Matchup Analysis"
      style={{
        backgroundColor: '#0f172a',
        borderRadius: '12px',
        border: '1px solid #334155',
        padding: '24px',
        marginBottom: '28px',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#1e293b',
              color: '#38bdf8',
              fontSize: '1.2em',
              border: '1px solid #334155',
            }}
          >
            📊
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25em', fontWeight: 600, color: '#f8fafc' }}>
              {title}
            </h3>
            {subtitle && (
              <div style={{ fontSize: '0.85em', color: '#94a3b8' }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontSize: '0.8em',
              padding: '4px 10px',
              backgroundColor: '#1e293b',
              color: '#38bdf8',
              borderRadius: '9999px',
              border: '1px solid #0284c7',
              fontWeight: 500,
            }}
          >
            {results.length} {results.length === 1 ? 'Player' : 'Players'} Analyzed
          </span>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: '1px solid #334155',
                color: '#94a3b8',
                borderRadius: '6px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '0.85em',
              }}
              title="Close Analysis"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Player Selection Filter Tabs */}
      {results.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '12px',
            marginBottom: '16px',
          }}
        >
          <button
            onClick={() => setSelectedPlayerKey('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: selectedPlayerKey === 'all' ? '1px solid #38bdf8' : '1px solid #334155',
              backgroundColor: selectedPlayerKey === 'all' ? '#0369a1' : '#1e293b',
              color: selectedPlayerKey === 'all' ? '#ffffff' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '0.85em',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>👥</span> All Players ({results.length})
          </button>

          {results.map((player, idx) => {
            const key = getPlayerKey(player, idx);
            const isSelected = selectedPlayerKey === key;
            const flagUrl = getFlagUrl(player.civilization);
            const color = playerColors[key] || '#38bdf8';

            return (
              <button
                key={key}
                onClick={() => setSelectedPlayerKey(key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: isSelected ? `1px solid ${color}` : '1px solid #334155',
                  backgroundColor: isSelected ? '#1e293b' : '#0f172a',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.85em',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isSelected ? `0 0 8px ${color}33` : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: color,
                  }}
                />
                {flagUrl && (
                  <img
                    src={flagUrl}
                    alt={player.civilization}
                    style={{
                      width: '18px',
                      height: '12px',
                      objectFit: 'cover',
                      borderRadius: '2px',
                    }}
                  />
                )}
                <span>{player.gamerName || `Player ${idx + 1}`}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Players Cards Grid / List */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            displayedResults.length === 1
              ? '1fr'
              : 'repeat(auto-fit, minmax(min(100%, 540px), 1fr))',
          gap: '20px',
        }}
      >
        {displayedResults.map((player, idx) => {
          const key = getPlayerKey(player, idx);
          const color = playerColors[key] || '#38bdf8';
          const flagUrl = getFlagUrl(player.civilization);
          const summary = player.summary;

          return (
            <PlayerCard
              key={key}
              player={player}
              summary={summary}
              color={color}
              flagUrl={flagUrl}
            />
          );
        })}
      </div>
    </section>
  );
};

interface PlayerCardProps {
  player: PlayerMatchupResult;
  summary?: PlayerSummary | null;
  color: string;
  flagUrl?: string;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, summary, color, flagUrl }) => {
  const gamesAnalyzed = summary?.gamesAnalyzed ?? player.gameIds?.length ?? 0;
  const apm = summary?.averageApm;

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        borderRadius: '10px',
        border: '1px solid #334155',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Player Header Banner */}
      <div
        style={{
          padding: '16px',
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #334155',
          borderLeft: `4px solid ${color}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {flagUrl && (
            <img
              src={flagUrl}
              alt={player.civilization}
              style={{
                width: '32px',
                height: '22px',
                objectFit: 'cover',
                borderRadius: '3px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }}
            />
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1em', fontWeight: 600, color: '#f8fafc' }}>
                {player.gamerName}
              </span>
              {player.profileId && (
                <a
                  href={`https://aoe4world.com/players/${player.profileId}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '0.75em',
                    color: '#60a5fa',
                    textDecoration: 'none',
                    backgroundColor: '#1e293b',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid #334155',
                  }}
                  title="View player profile on aoe4world.com"
                >
                  #{player.profileId} ↗
                </a>
              )}
            </div>
            <div style={{ fontSize: '0.85em', color: '#94a3b8' }}>
              {formatCivName(player.civilization)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {apm !== undefined && apm !== null && (
            <span
              style={{
                fontSize: '0.8em',
                padding: '3px 8px',
                backgroundColor: '#0f172a',
                color: '#fbbf24',
                border: '1px solid #b45309',
                borderRadius: '6px',
                fontWeight: 600,
              }}
              title="Average actions per minute across analyzed games"
            >
              ⚡ {Math.round(apm)} APM
            </span>
          )}
          <span
            style={{
              fontSize: '0.8em',
              padding: '3px 8px',
              backgroundColor: '#0f172a',
              color: '#94a3b8',
              border: '1px solid #334155',
              borderRadius: '6px',
            }}
            title="Number of match games in analysis sample"
          >
            🎮 {gamesAnalyzed} {gamesAnalyzed === 1 ? 'game' : 'games'}
          </span>
        </div>
      </div>

      {/* Main Body Metrics */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
        {!summary || gamesAnalyzed === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '24px 12px',
              color: '#94a3b8',
              fontSize: '0.9em',
            }}
          >
            No aggregated summary metrics available for this player.
          </div>
        ) : (
          <>
            {/* Age Up Timings Subsection */}
            <AgeUpTimingsSection ageUpTimings={summary.ageUpTimings} />

            {/* Villager & Economy Subsection */}
            <VillagerSection
              villagers={summary.villagerProduction}
              traders={summary.traderProduction}
              townCenters={summary.additionalTownCenters}
            />

            {/* Military Production Subsection */}
            <MilitarySection military={summary.militaryProduction} />

            {/* Landmarks Subsection */}
            <LandmarksSection landmarks={summary.landmarks} />

            {/* Analyzed Game IDs Pills */}
            {player.gameIds && player.gameIds.length > 0 && (
              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: '12px',
                  borderTop: '1px solid #334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '0.75em', color: '#64748b' }}>Analyzed Matches:</span>
                {player.gameIds.map((id) => (
                  <a
                    key={id}
                    href={`https://aoe4world.com/games/${id}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '0.75em',
                      color: '#94a3b8',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      textDecoration: 'none',
                    }}
                    title={`Open game #${id} on aoe4world.com`}
                  >
                    #{id} ↗
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const AgeUpTimingsSection: React.FC<{
  ageUpTimings?: PlayerSummary['ageUpTimings'];
}> = ({ ageUpTimings }) => {
  const feudal = ageUpTimings?.averageFeudalAgeSeconds;
  const castle = ageUpTimings?.averageCastleAgeSeconds;
  const imperial = ageUpTimings?.averageImperialAgeSeconds;

  const hasAnyAgeUp =
    (feudal !== null && feudal !== undefined && feudal > 0) ||
    (castle !== null && castle !== undefined && castle > 0) ||
    (imperial !== null && imperial !== undefined && imperial > 0);

  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        borderRadius: '8px',
        padding: '12px',
        border: '1px solid #334155',
      }}
    >
      <div
        style={{
          fontSize: '0.8em',
          fontWeight: 600,
          color: '#cbd5e1',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span>⏱</span> Average Age-Up Timings
      </div>

      {!hasAnyAgeUp ? (
        <div style={{ fontSize: '0.85em', color: '#64748b', fontStyle: 'italic' }}>
          No age transitions recorded.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              padding: '8px 4px',
              borderRadius: '6px',
              border: '1px solid #334155',
            }}
          >
            <div style={{ fontSize: '0.7em', color: '#94a3b8' }}>Age II (Feudal)</div>
            <div
              style={{
                fontSize: '1em',
                fontWeight: 600,
                color: feudal ? '#38bdf8' : '#64748b',
                marginTop: '2px',
              }}
            >
              {formatSeconds(feudal)}
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#1e293b',
              padding: '8px 4px',
              borderRadius: '6px',
              border: '1px solid #334155',
            }}
          >
            <div style={{ fontSize: '0.7em', color: '#94a3b8' }}>Age III (Castle)</div>
            <div
              style={{
                fontSize: '1em',
                fontWeight: 600,
                color: castle ? '#a855f7' : '#64748b',
                marginTop: '2px',
              }}
            >
              {formatSeconds(castle)}
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#1e293b',
              padding: '8px 4px',
              borderRadius: '6px',
              border: '1px solid #334155',
            }}
          >
            <div style={{ fontSize: '0.7em', color: '#94a3b8' }}>Age IV (Imperial)</div>
            <div
              style={{
                fontSize: '1em',
                fontWeight: 600,
                color: imperial ? '#f59e0b' : '#64748b',
                marginTop: '2px',
              }}
            >
              {formatSeconds(imperial)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const VillagerSection: React.FC<{
  villagers?: PlayerSummary['villagerProduction'];
  traders?: PlayerSummary['traderProduction'];
  townCenters?: PlayerSummary['additionalTownCenters'];
}> = ({ villagers, traders, townCenters }) => {
  const totalVills = villagers?.total;
  const totalTraders = traders?.total;
  const totalTCs = townCenters?.total;

  const hasTraders =
    (totalTraders !== undefined && totalTraders !== null && totalTraders > 0) ||
    (traders?.darkAge !== undefined && traders?.darkAge !== null && traders.darkAge > 0) ||
    (traders?.feudalAge !== undefined && traders?.feudalAge !== null && traders.feudalAge > 0) ||
    (traders?.castleAge !== undefined && traders?.castleAge !== null && traders.castleAge > 0) ||
    (traders?.imperialAge !== undefined && traders?.imperialAge !== null && traders.imperialAge > 0);

  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        borderRadius: '8px',
        padding: '12px',
        border: '1px solid #334155',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          flexWrap: 'wrap',
          gap: '6px',
        }}
      >
        <div
          style={{
            fontSize: '0.8em',
            fontWeight: 600,
            color: '#cbd5e1',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>🌾</span> Villagers & Economy
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {totalVills !== undefined && totalVills !== null && (
            <span style={{ fontSize: '0.8em', color: '#22c55e', fontWeight: 600 }}>
              Avg Vills: {totalVills.toFixed(1)}
            </span>
          )}
          {totalTraders !== undefined && totalTraders !== null && (
            <span
              style={{
                fontSize: '0.8em',
                color: hasTraders ? '#f59e0b' : '#94a3b8',
                fontWeight: 600,
              }}
            >
              Avg Traders: {totalTraders.toFixed(1)}
            </span>
          )}
          {totalTCs !== undefined && totalTCs !== null && totalTCs > 0 && (
            <span style={{ fontSize: '0.8em', color: '#eab308', fontWeight: 500 }}>
              +{totalTCs.toFixed(1)} Extra TC
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '6px',
          fontSize: '0.75em',
        }}
      >
        <div
          style={{
            backgroundColor: '#1e293b',
            padding: '6px 8px',
            borderRadius: '6px',
            border: '1px solid #334155',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Dark</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ fontWeight: 600, color: '#f8fafc' }} title="Villagers produced">
              <span style={{ color: '#22c55e', marginRight: '3px' }}>🌾</span>
              {villagers?.darkAge !== undefined && villagers?.darkAge !== null
                ? villagers.darkAge.toFixed(1)
                : '-'}
            </div>
            <div
              style={{
                fontWeight: 500,
                color: (traders?.darkAge ?? 0) > 0 ? '#f59e0b' : '#64748b',
                fontSize: '0.9em',
              }}
              title="Traders produced"
            >
              <span style={{ marginRight: '3px' }}>🪙</span>
              {traders?.darkAge !== undefined && traders?.darkAge !== null
                ? traders.darkAge.toFixed(1)
                : '-'}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#1e293b',
            padding: '6px 8px',
            borderRadius: '6px',
            border: '1px solid #334155',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Feudal</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ fontWeight: 600, color: '#f8fafc' }} title="Villagers produced">
              <span style={{ color: '#22c55e', marginRight: '3px' }}>🌾</span>
              {villagers?.feudalAge !== undefined && villagers?.feudalAge !== null
                ? villagers.feudalAge.toFixed(1)
                : '-'}
            </div>
            <div
              style={{
                fontWeight: 500,
                color: (traders?.feudalAge ?? 0) > 0 ? '#f59e0b' : '#64748b',
                fontSize: '0.9em',
              }}
              title="Traders produced"
            >
              <span style={{ marginRight: '3px' }}>🪙</span>
              {traders?.feudalAge !== undefined && traders?.feudalAge !== null
                ? traders.feudalAge.toFixed(1)
                : '-'}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#1e293b',
            padding: '6px 8px',
            borderRadius: '6px',
            border: '1px solid #334155',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Castle</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ fontWeight: 600, color: '#f8fafc' }} title="Villagers produced">
              <span style={{ color: '#22c55e', marginRight: '3px' }}>🌾</span>
              {villagers?.castleAge !== undefined && villagers?.castleAge !== null
                ? villagers.castleAge.toFixed(1)
                : '-'}
            </div>
            <div
              style={{
                fontWeight: 500,
                color: (traders?.castleAge ?? 0) > 0 ? '#f59e0b' : '#64748b',
                fontSize: '0.9em',
              }}
              title="Traders produced"
            >
              <span style={{ marginRight: '3px' }}>🪙</span>
              {traders?.castleAge !== undefined && traders?.castleAge !== null
                ? traders.castleAge.toFixed(1)
                : '-'}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#1e293b',
            padding: '6px 8px',
            borderRadius: '6px',
            border: '1px solid #334155',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Imperial</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ fontWeight: 600, color: '#f8fafc' }} title="Villagers produced">
              <span style={{ color: '#22c55e', marginRight: '3px' }}>🌾</span>
              {villagers?.imperialAge !== undefined && villagers?.imperialAge !== null
                ? villagers.imperialAge.toFixed(1)
                : '-'}
            </div>
            <div
              style={{
                fontWeight: 500,
                color: (traders?.imperialAge ?? 0) > 0 ? '#f59e0b' : '#64748b',
                fontSize: '0.9em',
              }}
              title="Traders produced"
            >
              <span style={{ marginRight: '3px' }}>🪙</span>
              {traders?.imperialAge !== undefined && traders?.imperialAge !== null
                ? traders.imperialAge.toFixed(1)
                : '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MilitarySection: React.FC<{
  military?: MilitaryUnitSummary[] | null;
}> = ({ military }) => {
  const units = [...(military ?? [])].sort((a, b) => {
    const pctA = a.percentageOfTotal ?? 0;
    const pctB = b.percentageOfTotal ?? 0;
    if (pctB !== pctA) {
      return pctB - pctA;
    }
    const avgA = a.averageCount ?? 0;
    const avgB = b.averageCount ?? 0;
    if (avgB !== avgA) {
      return avgB - avgA;
    }
    return (a.unitType || '').localeCompare(b.unitType || '');
  });

  const totalAvgMilitary = units.reduce((acc, unit) => acc + (unit.averageCount ?? 0), 0);

  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        borderRadius: '8px',
        padding: '12px',
        border: '1px solid #334155',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          flexWrap: 'wrap',
          gap: '6px',
        }}
      >
        <div
          style={{
            fontSize: '0.8em',
            fontWeight: 600,
            color: '#cbd5e1',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>⚔️</span> Military Unit Composition
        </div>
        {units.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8em', color: '#22c55e', fontWeight: 600 }}>
              Avg Military: {totalAvgMilitary.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {units.length === 0 ? (
        <div style={{ fontSize: '0.85em', color: '#64748b', fontStyle: 'italic' }}>
          No tracked military units recorded.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {units.map((unit) => {
            const pct = unit.percentageOfTotal ?? 0;
            const avg = unit.averageCount ?? 0;

            return (
              <div
                key={unit.unitType}
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  border: '1px solid #334155',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.85em',
                    marginBottom: '4px',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                    {formatUnitName(unit.unitType)}
                  </span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.8em' }}>
                      {avg.toFixed(1)} avg
                    </span>
                    <span
                      style={{
                        color: '#38bdf8',
                        fontWeight: 600,
                        fontSize: '0.8em',
                        minWidth: '42px',
                        textAlign: 'right',
                      }}
                    >
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Percentage Bar */}
                <div
                  style={{
                    height: '5px',
                    backgroundColor: '#0f172a',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    marginBottom: '6px',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, pct))}%`,
                      backgroundColor: '#ef4444',
                      borderRadius: '3px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                {/* Age Breakdown */}
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    fontSize: '0.7em',
                    color: '#64748b',
                  }}
                >
                  <span>D: {unit.darkAge?.toFixed(0) ?? 0}</span>
                  <span>F: {unit.feudalAge?.toFixed(0) ?? 0}</span>
                  <span>C: {unit.castleAge?.toFixed(0) ?? 0}</span>
                  <span>I: {unit.imperialAge?.toFixed(0) ?? 0}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const LandmarksSection: React.FC<{
  landmarks?: LandmarkSummary[] | null;
}> = ({ landmarks }) => {
  const lms = [...(landmarks ?? [])].sort((a, b) => {
    const ageA = a.targetAge ?? 99;
    const ageB = b.targetAge ?? 99;
    if (ageA !== ageB) {
      return ageA - ageB;
    }
    const pickA = a.pickRatePercentage ?? 0;
    const pickB = b.pickRatePercentage ?? 0;
    if (pickB !== pickA) {
      return pickB - pickA;
    }
    return (a.landmarkName || '').localeCompare(b.landmarkName || '');
  });

  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        borderRadius: '8px',
        padding: '12px',
        border: '1px solid #334155',
      }}
    >
      <div
        style={{
          fontSize: '0.8em',
          fontWeight: 600,
          color: '#cbd5e1',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span>🏛</span> Landmark Preferences & Choices
      </div>

      {lms.length === 0 ? (
        <div style={{ fontSize: '0.85em', color: '#64748b', fontStyle: 'italic' }}>
          No landmark build records found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {lms.map((lm, idx) => {
            const pickRate = lm.pickRatePercentage ?? 0;
            const avgTime = lm.averageGameTimeSeconds;

            return (
              <div
                key={`${lm.landmarkName}-${idx}`}
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  border: '1px solid #334155',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {lm.icon ? (
                    <img
                      src={lm.icon}
                      alt={lm.landmarkName}
                      style={{
                        width: '24px',
                        height: '24px',
                        objectFit: 'contain',
                        borderRadius: '4px',
                        backgroundColor: '#0f172a',
                      }}
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8em',
                      }}
                    >
                      🏛
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: '0.85em', fontWeight: 600, color: '#f8fafc' }}>
                      {lm.landmarkName}
                    </div>
                    <div style={{ fontSize: '0.7em', color: '#94a3b8' }}>
                      {getTargetAgeLabel(lm.targetAge)}
                      {avgTime !== undefined && avgTime !== null && avgTime > 0 && (
                        <span> • Avg: {formatSeconds(avgTime)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '0.75em',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: pickRate >= 50 ? '#065f46' : '#1e293b',
                      color: pickRate >= 50 ? '#6ee7b7' : '#94a3b8',
                      border: `1px solid ${pickRate >= 50 ? '#059669' : '#334155'}`,
                      fontWeight: 600,
                    }}
                    title={`Built in ${pickRate.toFixed(0)}% of analyzed games (${lm.timesBuilt ?? 0} times)`}
                  >
                    {pickRate.toFixed(0)}% pick
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
