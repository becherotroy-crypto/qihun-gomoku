export const BOARD_SIZE = 15
export const WIN_LENGTH = 5

export type Stone = 'black' | 'white'
export type Cell = Stone | null
export type Board = Cell[][]

export interface Position {
  row: number
  col: number
}

export interface Move extends Position {
  player: Stone
  /** One-based move number. */
  number: number
}

export type GameStatus = 'playing' | 'won' | 'draw'

export interface GameState {
  board: Board
  currentPlayer: Stone
  status: GameStatus
  winner: Stone | null
  winningLine: Position[]
  moves: Move[]
  lastMove: Move | null
}

export type MoveErrorCode =
  | 'game_over'
  | 'out_of_bounds'
  | 'occupied'
  | 'wrong_turn'

export type MoveResult =
  | { ok: true; state: GameState; move: Move }
  | { ok: false; state: GameState; error: MoveErrorCode }

export type AIDifficulty = 'easy' | 'normal' | 'hard' | 'master'

export interface AIOptions {
  /** Injectable for deterministic tests. Only the easy level uses randomness. */
  random?: () => number
  /** Search deadline override. Ignored by easy and normal. */
  timeLimitMs?: number
  /** Optional cancellation hook for screens that have already been dismissed. */
  shouldCancel?: () => boolean
}

export type AIMoveReason =
  | 'opening'
  | 'win_now'
  | 'forced_block'
  | 'attack'
  | 'defense'
  | 'positional'

export interface CandidateScore {
  position: Position
  score: number
  attackScore: number
  defenseScore: number
  isWinning: boolean
  isBlocking: boolean
}

export interface AIDecision extends CandidateScore {
  difficulty: AIDifficulty
  reason: AIMoveReason
  searchedDepth: number
  nodes: number
}

export interface GameOutcome {
  status: GameStatus
  winner: Stone | null
  winningLine: Position[]
}

