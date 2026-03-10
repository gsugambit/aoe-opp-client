import React from 'react';
import { Link } from 'react-router-dom';
import type { GameResult, ResultTeam } from './aoe4OppApi';

// Preload all civilization flag images from assets via Vite's glob import
const flagImages = import.meta.glob('../../assets/flags/*', {
  eager: true,
  as: 'url',
}) as Record<string, string>;

const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Common aliases/normalizations for AOE4 civ names
const CIV_ALIASES: Record<string, string[]> = {
  'holy-roman-empire': ['hre', 'holy_roman_empire', 'holyromanempire'],
  'abbasid-dynasty': ['abbasid', 'abbasid_dynasty'],
  'delhi-sultanate': ['delhi', 'delhi_sultanate'],
  'ottomans': ['ottoman'],
  'sengoku-daimyo': ['sengoku_daimyo'],
  'order-of-the-dragon': ['order_of_the_dragon'],
  'zhu-xi-s-legacy': ['zhu_xis_legacy', 'zhu_xi_s_legacy'],
};

const getFlagUrl = (civilization: string | undefined): string | undefined => {
  if (!civilization) return undefined;
  const slug = toSlug(civilization);
  const underscoreSlug = slug.replace(/-/g, '_');
  const candidates = [slug, underscoreSlug, ...(CIV_ALIASES[slug] ?? [])];

  // Try to find an image whose base filename matches one of the candidates
  for (const [path, url] of Object.entries(flagImages)) {
    const filename = path.split('/').pop() || '';
    const base = filename.substring(0, filename.lastIndexOf('.')).toLowerCase();
    if (candidates.includes(base)) return url;
  }
  return undefined;
};

interface GameDisplayProps {
  games: GameResult[];
  playerId: number;
}

export const GameDisplay: React.FC<GameDisplayProps> = ({ games, playerId }) => {
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
    <div style={{ textAlign: 'left', marginTop: '20px' }}>
      {games.length === 0 ? (
        <p>No games found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #555', textAlign: 'left' }}>
              <th style={{ padding: '12px 8px' }}>Info</th>
              <th style={{ padding: '12px 8px' }}>Your Team</th>
              <th style={{ padding: '12px 8px' }}></th>
              <th style={{ padding: '12px 8px' }}>Opponent Team</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => {
              const hasWinner = !!game.winningTeam && game.winningTeam.players.length > 0;
              const playerInWinningTeam = hasWinner ? game.winningTeam!.players.some(p => p.profileId === playerId) : false;
              
              let yourTeam: ResultTeam;
              let opponentTeam: ResultTeam;
              let yourStatus: 'Win' | 'Loss' | 'Draw';
              let opponentStatus: 'Win' | 'Loss' | 'Draw';

              if (hasWinner) {
                yourTeam = playerInWinningTeam ? game.winningTeam! : (game.losingTeams.find(t => t.players.some(p => p.profileId === playerId)) ?? game.losingTeams[0]);
                opponentTeam = playerInWinningTeam ? game.losingTeams[0] : game.winningTeam!;
                yourStatus = playerInWinningTeam ? 'Win' : 'Loss';
                opponentStatus = yourStatus === 'Win' ? 'Loss' : 'Win';
              } else {
                yourTeam = game.losingTeams.find(t => t.players.some(p => p.profileId === playerId)) ?? game.losingTeams[0];
                opponentTeam = game.losingTeams.find(t => t !== yourTeam) ?? (game.losingTeams.length > 1 ? game.losingTeams[1] : { players: [] } as ResultTeam);
                yourStatus = 'Draw';
                opponentStatus = 'Draw';
              }

              return (
                <tr key={game.gameId} style={{ borderBottom: '1px solid #444' }}>
                  <td style={{ padding: '12px 8px', fontSize: '0.85em', color: '#ccc' }}>
                    <div>{new Date(game.startedAt).toLocaleDateString()}</div>
                    <div style={{ fontStyle: 'italic' }}>{game.map}</div>
                    <div style={{ fontSize: '0.8em', opacity: 0.8 }}>{game.matchType}</div>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};
