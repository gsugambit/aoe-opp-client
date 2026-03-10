import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetGameInfoQuery } from './aoe4OppApi';
import { GameDisplay } from './GameDisplay';

export const PlayerResultsPage: React.FC = () => {
  const { playerId: playerIdParam } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const playerId = playerIdParam ? parseInt(playerIdParam, 10) : null;

  const { data: games, error, isFetching } = useGetGameInfoQuery(playerId!, {
    skip: playerId === null || isNaN(playerId),
  });

  return (
    <div style={{ padding: '20px' }}>
      <button onClick={() => navigate('/')} style={{ marginBottom: '20px' }}>
        ← Back to Search
      </button>
      
      <h2>Game Results</h2>
      
      {isFetching && (
        <div style={{
          padding: '20px',
          backgroundColor: '#2c3e50',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '15px',
          border: '1px solid #34495e'
        }}>
          <div className="loading-spinner" style={{
            width: '24px',
            height: '24px',
            border: '3px solid rgba(255,255,255,.3)',
            borderTop: '3px solid #fff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
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
          Error: {('status' in error) ? `Status ${error.status}` : 'Unknown error'}
        </p>
      )}

      {games && playerId !== null && !isNaN(playerId) && (
        <GameDisplay games={games} playerId={playerId} />
      )}
    </div>
  );
};
