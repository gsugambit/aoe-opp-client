import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const Leaderboard = {
  RM_SOLO: 'rm_solo',
  RM_TEAM: 'rm_team',
  QM_1V1: 'qm_1v1',
  QM_2V2: 'qm_2v2',
  QM_3V3: 'qm_3v3',
  QM_4V4: 'qm_4v4',
} as const;

export type Leaderboard = (typeof Leaderboard)[keyof typeof Leaderboard];

export const PlayerSearchLeaderboard = Leaderboard;
export type PlayerSearchLeaderboard = Leaderboard;

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

export interface GetGameInfoParams {
  playerId: number;
  page?: number;
  perPage?: number;
  per_page?: number;
  pageSize?: number;
  leaderboard?: Leaderboard | string | (Leaderboard | string)[];
  leaderboards?: Leaderboard | string | (Leaderboard | string)[];
}

export interface SearchPlayersParams {
  gamertag: string;
  leaderboard?: PlayerSearchLeaderboard | Leaderboard | string;
  page?: number;
  perPage?: number;
  per_page?: number;
  pageSize?: number;
}

export interface ScrapeGameSummaryParams {
  profileId: number | string;
  gamerName: string;
  gameId: number | string;
  leaderboard?: Leaderboard | string;
  page?: number;
}

export interface TimelineDataPoint {
  timestamp: number;
  villagerCount: number;
  militaryCount: number;
  totalPopulation: number;
}


export interface PlayerGameAnalysis {
  profileId?: string | null;
  name?: string | null;
  civilization?: string | null;
  result?: string | null;
  apm?: number | null;
  ageUpTimings?: AgeUpSummary | null;
  villagerProduction?: VillagerSummary | null;
  traderProduction?: TraderSummary | null;
  militaryProduction?: MilitaryUnitSummary[] | null;
  additionalTownCenters?: TownCenterSummary | null;
  landmarks?: LandmarkSummary[] | null;
  dataPoints?: TimelineDataPoint[];
}

export interface GameAnalysisResponse {
  gameId: string;
  leaderboard?: string | null;
  mapName?: string | null;
  durationSeconds: number;
  players: PlayerGameAnalysis[];
}

export interface AgeUpSummary {
  averageFeudalAgeSeconds?: number | null;
  averageCastleAgeSeconds?: number | null;
  averageImperialAgeSeconds?: number | null;
}

export interface VillagerSummary {
  darkAge?: number | null;
  feudalAge?: number | null;
  castleAge?: number | null;
  imperialAge?: number | null;
  total?: number | null;
}

export interface TraderSummary {
  darkAge?: number | null;
  feudalAge?: number | null;
  castleAge?: number | null;
  imperialAge?: number | null;
  total?: number | null;
}

export interface MilitaryUnitSummary {
  unitType: string;
  averageCount?: number | null;
  percentageOfTotal?: number | null;
  darkAge?: number | null;
  feudalAge?: number | null;
  castleAge?: number | null;
  imperialAge?: number | null;
}

export interface TownCenterSummary {
  darkAge?: number | null;
  feudalAge?: number | null;
  castleAge?: number | null;
  imperialAge?: number | null;
  total?: number | null;
}

export interface LandmarkSummary {
  landmarkName: string;
  icon?: string | null;
  pickRatePercentage?: number | null;
  averageGameTimeSeconds?: number | null;
  targetAge?: number | null;
  timesBuilt?: number | null;
}

export interface PlayerSummary {
  averageApm?: number | null;
  ageUpTimings?: AgeUpSummary | null;
  villagerProduction?: VillagerSummary | null;
  traderProduction?: TraderSummary | null;
  militaryProduction?: MilitaryUnitSummary[] | null;
  additionalTownCenters?: TownCenterSummary | null;
  landmarks?: LandmarkSummary[] | null;
  gamesAnalyzed?: number | null;
}

export interface MatchupPlayer {
  profileId: string | number;
  gamerName: string;
  civilization: string;
  leaderboard?: string;
}

export interface MatchupAnalysisRequest {
  players: MatchupPlayer[];
}

export interface PlayerMatchupResult {
  profileId: string;
  gamerName: string;
  civilization: string;
  gameIds: string[];
  summary?: PlayerSummary | null;
}

export interface MatchupAnalysisResponse {
  results: PlayerMatchupResult[];
}

export const getAoe4WorldGameUrl = (
  gameId: string | number,
  player?: { profileId?: string | number | null; name?: string | null } | null
): string => {
  if (player?.profileId && player?.name) {
    const cleanName = encodeURIComponent(player.name.trim());
    return `https://aoe4world.com/players/${player.profileId}-${cleanName}/games/${gameId}`;
  }
  if (player?.profileId) {
    return `https://aoe4world.com/players/${player.profileId}/games/${gameId}`;
  }
  return `https://aoe4world.com/games/${gameId}`;
};

export interface CivilizationOption {
  value: string;
  displayName: string;
}

export const aoe4OppApi = createApi({
  reducerPath: 'aoe4OppApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v1/aoe4-opp' }),
  endpoints: (builder) => ({
    getGameInfo: builder.query<GameResult[], number | GetGameInfoParams>({
      query: (args) => {
        if (typeof args === 'number') {
          return `/player/${args}/game-info`;
        }
        const { playerId, page, perPage, pageSize, per_page, leaderboard, leaderboards } = args;
        const params = new URLSearchParams();
        if (page !== undefined && page !== null) {
          params.append('page', page.toString());
        }
        const resolvedPerPage = per_page ?? perPage ?? pageSize;
        if (resolvedPerPage !== undefined && resolvedPerPage !== null) {
          params.append('per_page', resolvedPerPage.toString());
        }
        const resolvedLeaderboard = leaderboard ?? leaderboards;
        if (resolvedLeaderboard !== undefined && resolvedLeaderboard !== null && resolvedLeaderboard !== '') {
          if (Array.isArray(resolvedLeaderboard)) {
            resolvedLeaderboard.forEach((lb) => params.append('leaderboard', lb.toString()));
          } else {
            params.append('leaderboard', resolvedLeaderboard.toString());
          }
        }
        const queryString = params.toString();
        return `/player/${playerId}/game-info${queryString ? `?${queryString}` : ''}`;
      },
    }),
    searchPlayers: builder.query<PlayerSearchResponse, SearchPlayersParams>({
      query: ({
        gamertag,
        leaderboard = PlayerSearchLeaderboard.RM_SOLO,
        page,
        perPage,
        pageSize,
        per_page,
      }) => {
        const params = new URLSearchParams({
          gamertag,
          leaderboard: leaderboard.toString(),
        });
        if (page !== undefined && page !== null) {
          params.append('page', page.toString());
        }
        const resolvedPerPage = per_page ?? perPage ?? pageSize;
        if (resolvedPerPage !== undefined && resolvedPerPage !== null) {
          params.append('per_page', resolvedPerPage.toString());
        }
        return `/player/search?${params.toString()}`;
      },
    }),
    scrapeGameSummary: builder.query<unknown, ScrapeGameSummaryParams>({
      query: ({
        profileId,
        gamerName,
        gameId,
        leaderboard = Leaderboard.RM_SOLO,
        page = 1,
      }) => {
        const resolvedLeaderboard = leaderboard || Leaderboard.RM_SOLO;
        const resolvedPage = page ?? 1;
        const params = new URLSearchParams({
          profileId: profileId.toString(),
          gamerName,
          gameId: gameId.toString(),
          leaderboard: resolvedLeaderboard.toString(),
          page: resolvedPage.toString(),
        });
        return `/game-summary/scrape?${params.toString()}`;
      },
    }),
    getGameSummary: builder.query<unknown, number | string>({
      query: (gameId) => `/game-summary/${gameId}`,
    }),
    getGameAnalysis: builder.query<GameAnalysisResponse, number | string>({
      query: (gameId) => `/game-summary/${gameId}/analysis`,
    }),
    analyzeMatchup: builder.mutation<MatchupAnalysisResponse, MatchupAnalysisRequest>({
      query: (body) => ({
        url: '/game-summary/matchup-analysis',
        method: 'POST',
        body,
      }),
    }),
    getCivilizations: builder.query<CivilizationOption[], void>({
      query: () => '/civilizations',
      transformResponse: (response: unknown): CivilizationOption[] => {
        const formatFallback = (val: string): string => {
          return val
            .split(/[-_ ]+/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        };

        const parseItem = (item: unknown): CivilizationOption | null => {
          if (typeof item === 'string') {
            const trimmed = item.trim();
            if (!trimmed) return null;
            return {
              value: trimmed,
              displayName: formatFallback(trimmed),
            };
          }
          if (item && typeof item === 'object') {
            const obj = item as Record<string, unknown>;
            const val = String(obj.value ?? obj.name ?? obj.id ?? obj.slug ?? '').trim();
            if (!val) return null;
            const display = String(obj.displayName ?? obj.name ?? (val ? formatFallback(val) : '')).trim();
            return {
              value: val,
              displayName: display || formatFallback(val),
            };
          }
          return null;
        };

        if (Array.isArray(response)) {
          return response.map(parseItem).filter((c): c is CivilizationOption => c !== null);
        }
        if (response && typeof response === 'object' && 'civilizations' in response) {
          const civList = (response as { civilizations: unknown[] }).civilizations;
          if (Array.isArray(civList)) {
            return civList.map(parseItem).filter((c): c is CivilizationOption => c !== null);
          }
        }
        return [];
      },
    }),
  }),
});

export const {
  useGetGameInfoQuery,
  useSearchPlayersQuery,
  useScrapeGameSummaryQuery,
  useLazyScrapeGameSummaryQuery,
  useGetGameSummaryQuery,
  useLazyGetGameSummaryQuery,
  useGetGameAnalysisQuery,
  useLazyGetGameAnalysisQuery,
  useAnalyzeMatchupMutation,
  useGetCivilizationsQuery,
  useLazyGetCivilizationsQuery,
} = aoe4OppApi;
