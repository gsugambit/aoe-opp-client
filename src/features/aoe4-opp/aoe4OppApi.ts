import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface ResultPlayer {
  profileId: number;
  name: string;
  civilization: string;
  rating: number;
  mmr: number;
}

export interface ResultTeam {
  players: ResultPlayer[];
}

export interface GameResult {
  startedAt: string;
  duration: number;
  map: string;
  matchType: string;
  gameId: number;
  season: number;
  server: string;
  avgRating: number;
  avgMmr: number;
  winningTeam: ResultTeam | null;
  losingTeams: ResultTeam[];
}

export interface PlayerSearchResponse {
  count: number;
  leaderboard: string;
  players: SearchPlayer[];
  query: string;
}

export interface SearchPlayer {
  country: string;
  name: string;
  profileId: number;
  rank: number;
  rating: number;
  winRate: number;
}

export const aoe4OppApi = createApi({
  reducerPath: 'aoe4OppApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v1/aoe4-opp' }),
  endpoints: (builder) => ({
    getGameInfo: builder.query<GameResult[], number>({
      query: (playerId: number): string => `/player/${playerId}/game-info`,
    }),
    searchPlayers: builder.query<PlayerSearchResponse, { gamertag: string; leaderboard: string }>({
      query: ({ gamertag, leaderboard }) => `/player/search?gamertag=${gamertag}&leaderboard=${leaderboard}`,
    }),
  }),
});

export const { useGetGameInfoQuery, useSearchPlayersQuery } = aoe4OppApi;
