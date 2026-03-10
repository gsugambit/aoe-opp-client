import { Routes, Route } from 'react-router-dom'
import aoeoppLogo from './assets/aoe4-opp.jpg'
import './App.css'
import { DashboardPage } from './features/aoe4-opp/DashboardPage'
import { PlayerResultsPage } from './features/aoe4-opp/PlayerResultsPage'

function App() {
  return (
    <>
      <div>
        <a href="https://aoe4meta.com" target="_blank">
          <img src={aoeoppLogo} className="logo aoe4" alt="AOE4Opp logo" />
        </a>
      </div>
      <h1>AOE4 Opp Info</h1>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/player/:playerId" element={<PlayerResultsPage />} />
      </Routes>
    </>
  );
}

export default App
