import React, { useEffect, useState } from 'react';
import { Leaderboard, useSearchPlayersQuery } from './aoe4OppApi';

interface GameSearchProps {
  onSearch: (playerId: number, leaderboard?: string) => void;
  isFetching?: boolean;
  initialValue?: string;
  initialLeaderboard?: string;
}

export const GameSearch: React.FC<GameSearchProps> = ({
  onSearch,
  initialValue = '',
  initialLeaderboard = Leaderboard.RM_SOLO,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>(initialValue);
  const [leaderboard, setLeaderboard] = useState<string>(initialLeaderboard);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    setSearchTerm(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (initialLeaderboard) {
      setLeaderboard(initialLeaderboard);
    }
  }, [initialLeaderboard]);

  // Debounce search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isFetching } = useSearchPlayersQuery(
    { gamertag: debouncedSearchTerm, leaderboard },
    { skip: debouncedSearchTerm.length < 3 }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(searchTerm, 10);
    if (!isNaN(id)) {
      onSearch(id, leaderboard);
    }
  };

  const handleSelectPlayer = (profileId: number) => {
    onSearch(profileId, leaderboard);
    setShowDropdown(false);
  };

  return (
    <div style={{ position: 'relative', width: '360px', marginBottom: '20px' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
        <select
          value={leaderboard}
          onChange={(e) => setLeaderboard(e.target.value)}
          style={{ padding: '8px' }}
        >
          {Object.values(Leaderboard).map((lb) => (
            <option key={lb} value={lb}>
              {lb}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Enter Gamertag or ID"
          style={{ padding: '8px', flex: 1 }}
        />
        <button type="submit" disabled={isFetching} style={{ padding: '8px' }}>
          {isFetching ? '...' : 'Go'}
        </button>
      </form>

      {showDropdown && data && data.players && data.players.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: '#333',
          border: '1px solid #555',
          listStyle: 'none',
          padding: 0,
          margin: 0,
          maxHeight: '300px',
          overflowY: 'auto',
          zIndex: 1000,
          textAlign: 'left'
        }}>
          {data.players.map((player) => (
            <li
              key={player.profileId}
              onClick={() => handleSelectPlayer(player.profileId)}
              style={{
                padding: '10px',
                borderBottom: '1px solid #444',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#444')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ fontWeight: 'bold' }}>{player.name}</div>
              <div style={{ fontSize: '0.8em', color: '#ccc' }}>
                #{player.rank} | {player.rating} | {player.winRate}%
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
