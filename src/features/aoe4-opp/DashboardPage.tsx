import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GameSearch } from './GameSearch';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSearch = (id: number) => {
    navigate(`/player/${id}`);
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2>Age of Empires IV Recent Games</h2>
      <p>Search for a player to see their match history.</p>
      <GameSearch onSearch={handleSearch} />
    </div>
  );
};
