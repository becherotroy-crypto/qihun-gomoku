import type {
  AppSettings,
  DailyChallengeState,
  GameRecord,
  Move,
  Player,
  RankingPlayer,
  UserProfile,
} from '../types'

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 'local-player',
  nickname: '山止川行',
  avatar: '弈',
  level: 18,
  title: '弈林高手',
  experience: 168,
  wins: 126,
  losses: 38,
  draws: 8,
  streak: 5,
  bestStreak: 12,
  achievements: ['first-win', 'streak-5', 'games-20', 'master-win'],
}

export const DEFAULT_SETTINGS: AppSettings = {
  sound: true,
  music: true,
  boardTheme: 'walnut',
  pieceStyle: 'obsidian',
  darkMode: true,
  animationSpeed: 'standard',
  haptics: true,
}

const rankingSeeds: Array<Omit<RankingPlayer, 'rank'>> = [
  { id: 'rank-01', nickname: '闲敲云子', avatar: '云', level: 42, title: '九段棋圣', wins: 893, winRate: 91.8, streak: 24 },
  { id: 'rank-02', nickname: '长安一局', avatar: '安', level: 39, title: '八段国手', wins: 762, winRate: 89.4, streak: 19 },
  { id: 'rank-03', nickname: '松间照', avatar: '松', level: 37, title: '八段国手', wins: 704, winRate: 87.9, streak: 17 },
  { id: 'rank-04', nickname: '观棋不语', avatar: '观', level: 34, title: '七段名人', wins: 648, winRate: 84.7, streak: 15 },
  { id: 'rank-05', nickname: '白石有声', avatar: '石', level: 31, title: '七段名人', wins: 581, winRate: 82.1, streak: 13 },
  { id: 'rank-06', nickname: '半山听雨', avatar: '雨', level: 28, title: '六段棋士', wins: 472, winRate: 79.6, streak: 11 },
  { id: 'rank-07', nickname: '十九路灯', avatar: '灯', level: 25, title: '六段棋士', wins: 391, winRate: 77.2, streak: 9 },
  { id: 'rank-08', nickname: '清风入局', avatar: '清', level: 23, title: '五段棋士', wins: 326, winRate: 75.8, streak: 8 },
  {
    id: DEFAULT_USER_PROFILE.id,
    nickname: DEFAULT_USER_PROFILE.nickname,
    avatar: DEFAULT_USER_PROFILE.avatar,
    level: DEFAULT_USER_PROFILE.level,
    title: DEFAULT_USER_PROFILE.title,
    wins: DEFAULT_USER_PROFILE.wins,
    winRate: 73.3,
    streak: DEFAULT_USER_PROFILE.streak,
    isCurrentUser: true,
  },
  { id: 'rank-10', nickname: '落子无悔', avatar: '落', level: 17, title: '四段棋手', wins: 119, winRate: 69.8, streak: 4 },
]

export const DEFAULT_RANKINGS: RankingPlayer[] = rankingSeeds.map((player, index) => ({
  ...player,
  rank: index + 1,
}))

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function createDefaultDailyChallenge(date = new Date()): DailyChallengeState {
  return {
    date: getLocalDateKey(date),
    completed: false,
    attempts: 0,
    bestScore: 0,
    streak: 0,
  }
}

function daysAgo(days: number, now: Date): Date {
  const result = new Date(now)
  result.setDate(result.getDate() - days)
  return result
}

function toMoves(
  positions: Array<[number, number]>,
  startedAt: number,
  result: GameRecord['result'],
  firstPlayer: Player = 'black',
): Move[] {
  const direction = result === 'black' ? 1 : result === 'white' ? -1 : 0
  const variation = [-2, 1, -1, 3, 0, 4, 2, 6, 5, 8]

  return positions.map(([row, col], index) => ({
    row,
    col,
    player: index % 2 === 0 ? firstPlayer : firstPlayer === 'black' ? 'white' : 'black',
    moveNumber: index + 1,
    timestamp: startedAt + index * 8_000,
    evaluation: direction * Math.min(38, index * 4 + variation[index % variation.length]),
  }))
}

interface RecordSeed {
  id: string
  daysBefore: number
  hour: number
  duration: number
  mode: GameRecord['mode']
  difficulty?: GameRecord['difficulty']
  opponent: string
  playerColor: Player
  result: GameRecord['result']
  score?: number
  positions: Array<[number, number]>
}

export function createSeedRecords(now = new Date()): GameRecord[] {
  const seeds: RecordSeed[] = [
    {
      id: 'seed-master-win',
      daysBefore: 1,
      hour: 21,
      duration: 286,
      mode: 'ai',
      difficulty: 'master',
      opponent: '玄枢 · 大师',
      playerColor: 'black',
      result: 'black',
      score: 92,
      positions: [[7, 7], [6, 7], [7, 8], [6, 8], [7, 9], [6, 9], [7, 10], [8, 8], [7, 11]],
    },
    {
      id: 'seed-local-win',
      daysBefore: 2,
      hour: 18,
      duration: 624,
      mode: 'local',
      opponent: '访客棋手',
      playerColor: 'white',
      result: 'white',
      positions: [[6, 7], [7, 7], [6, 8], [7, 8], [6, 9], [7, 9], [8, 8], [7, 10], [8, 9], [7, 11]],
    },
    {
      id: 'seed-hard-loss',
      daysBefore: 4,
      hour: 22,
      duration: 198,
      mode: 'ai',
      difficulty: 'hard',
      opponent: '玄枢 · 困难',
      playerColor: 'white',
      result: 'black',
      score: 71,
      positions: [[5, 5], [7, 8], [6, 6], [8, 7], [7, 7], [6, 8], [8, 8], [9, 7], [9, 9]],
    },
    {
      id: 'seed-daily-win',
      daysBefore: 6,
      hour: 12,
      duration: 173,
      mode: 'daily',
      difficulty: 'hard',
      opponent: '每日残局',
      playerColor: 'black',
      result: 'black',
      score: 96,
      positions: [[4, 7], [6, 8], [5, 7], [9, 7], [6, 7], [8, 8], [7, 7], [10, 7], [8, 7]],
    },
    {
      id: 'seed-normal-win',
      daysBefore: 9,
      hour: 20,
      duration: 242,
      mode: 'ai',
      difficulty: 'normal',
      opponent: '玄枢 · 普通',
      playerColor: 'white',
      result: 'white',
      score: 88,
      positions: [[6, 7], [7, 7], [6, 8], [7, 8], [8, 8], [7, 9], [8, 9], [7, 10], [9, 9], [7, 11]],
    },
  ]

  return seeds.map((seed) => {
    const date = daysAgo(seed.daysBefore, now)
    date.setHours(seed.hour, 18, 0, 0)
    const { positions, daysBefore: _daysBefore, hour: _hour, ...record } = seed

    return {
      ...record,
      date: date.toISOString(),
      moves: toMoves(positions, date.getTime(), seed.result),
    }
  })
}

export const DEFAULT_GAME_RECORDS: GameRecord[] = createSeedRecords()
