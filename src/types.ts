export type Player = 'black' | 'white'
export type Cell = Player | null
export type GameMode = 'local' | 'ai' | 'daily' | 'tutorial' | 'online'
export type Difficulty = 'easy' | 'normal' | 'hard' | 'master'
export type GameResult = Player | 'draw' | null
export type BoardTheme = 'walnut' | 'maple' | 'ink'
export type PieceStyle = 'obsidian' | 'jade' | 'classic'
export type AnimationSpeed = 'calm' | 'standard' | 'swift'

export interface Position {
  row: number
  col: number
}

export interface Move extends Position {
  player: Player
  moveNumber: number
  timestamp: number
  evaluation?: number
}

export interface GameRecord {
  id: string
  mode: GameMode
  difficulty?: Difficulty
  date: string
  duration: number
  moves: Move[]
  result: GameResult
  opponent: string
  playerColor: Player
  score?: number
}

export interface UserProfile {
  id: string
  nickname: string
  avatar: string
  level: number
  title: string
  experience: number
  wins: number
  losses: number
  draws: number
  streak: number
  bestStreak: number
  achievements: string[]
}

export interface AppSettings {
  sound: boolean
  music: boolean
  boardTheme: BoardTheme
  pieceStyle: PieceStyle
  darkMode: boolean
  animationSpeed: AnimationSpeed
  haptics: boolean
}

export interface RankingPlayer {
  id: string
  rank: number
  nickname: string
  avatar: string
  level: number
  title: string
  wins: number
  winRate: number
  streak: number
  isCurrentUser?: boolean
}

export interface DailyChallengeState {
  /** Local calendar date in YYYY-MM-DD format. */
  date: string
  completed: boolean
  attempts: number
  bestScore: number
  streak: number
  lastCompletedDate?: string
  recordId?: string
}
