import {
  BOARD_SIZE,
  type AIDecision,
  type AIDifficulty,
  type AIOptions,
  type AIMoveReason,
  type Board,
  type CandidateScore,
  type GameState,
  type Position,
  type Stone,
} from './types'
import { cloneBoard, isBoardFull, otherPlayer } from './engine'

export const AI_WIN_SCORE = 10_000_000

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const

const SEARCH_CONFIG: Record<
  'hard' | 'master',
  { depths: number[]; candidateLimit: number; timeLimitMs: number }
> = {
  hard: { depths: [2], candidateLimit: 12, timeLimitMs: 55 },
  master: { depths: [2, 3], candidateLimit: 10, timeLimitMs: 140 },
}

interface SearchContext {
  rootPlayer: Stone
  deadline: number
  candidateLimit: number
  shouldCancel?: () => boolean
  nodes: number
  aborted: boolean
}

interface SearchResult {
  candidate: CandidateScore
  value: number
  complete: boolean
}

/**
 * Scores a legal empty point from one player's perspective. This is intentionally
 * allocation-free because search calls it many thousands of times.
 */
export function evaluatePlacement(
  board: Board,
  position: Position,
  player: Stone,
): number {
  if (!isEmptyPoint(board, position)) return Number.NEGATIVE_INFINITY

  let score = centerBonus(position)

  for (const [rowDelta, colDelta] of DIRECTIONS) {
    const forward = countSide(board, position, player, rowDelta, colDelta)
    const backward = countSide(board, position, player, -rowDelta, -colDelta)
    const length = 1 + forward.count + backward.count

    if (length >= 5) return AI_WIN_SCORE

    const openEnds = Number(forward.open) + Number(backward.open)
    score += scoreRun(length, openEnds)
    score += scoreFiveCellWindows(board, position, player, rowDelta, colDelta)
  }

  return score
}

export function isWinningPlacement(
  board: Board,
  position: Position,
  player: Stone,
): boolean {
  if (!isEmptyPoint(board, position)) return false

  return DIRECTIONS.some(([rowDelta, colDelta]) => {
    const forward = countSide(board, position, player, rowDelta, colDelta)
    const backward = countSide(board, position, player, -rowDelta, -colDelta)
    return 1 + forward.count + backward.count >= 5
  })
}

export function getCandidatePositions(board: Board, radius = 2): Position[] {
  const encoded = new Set<number>()
  let hasStone = false

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row]?.[col] === null) continue
      hasStone = true

      for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
        for (let colOffset = -radius; colOffset <= radius; colOffset += 1) {
          const candidateRow = row + rowOffset
          const candidateCol = col + colOffset
          if (
            candidateRow < 0 ||
            candidateRow >= BOARD_SIZE ||
            candidateCol < 0 ||
            candidateCol >= BOARD_SIZE ||
            board[candidateRow][candidateCol] !== null
          ) {
            continue
          }
          encoded.add(candidateRow * BOARD_SIZE + candidateCol)
        }
      }
    }
  }

  if (!hasStone) {
    const center = Math.floor(BOARD_SIZE / 2)
    return [{ row: center, col: center }]
  }

  return [...encoded].map((value) => ({
    row: Math.floor(value / BOARD_SIZE),
    col: value % BOARD_SIZE,
  }))
}

export function rankCandidateMoves(
  board: Board,
  player: Stone,
  difficulty: AIDifficulty = 'normal',
  limit = Number.POSITIVE_INFINITY,
): CandidateScore[] {
  const opponent = otherPlayer(player)
  const defenseWeight = difficulty === 'easy' ? 0.82 : difficulty === 'normal' ? 0.94 : 1.06

  return getCandidatePositions(board)
    .map((position): CandidateScore => {
      const attackScore = evaluatePlacement(board, position, player)
      const defenseScore = evaluatePlacement(board, position, opponent)
      const isWinning = attackScore >= AI_WIN_SCORE
      const isBlocking = defenseScore >= AI_WIN_SCORE
      return {
        position,
        attackScore,
        defenseScore,
        isWinning,
        isBlocking,
        score: attackScore + defenseScore * defenseWeight,
      }
    })
    .sort(compareCandidates)
    .slice(0, limit)
}

/** Returns a detailed decision suitable for hints and diagnostics. */
export function chooseAIMove(
  board: Board,
  player: Stone,
  difficulty: AIDifficulty = 'normal',
  options: AIOptions = {},
): AIDecision | null {
  if (isBoardFull(board)) return null

  const ranked = rankCandidateMoves(board, player, difficulty)
  if (ranked.length === 0) return null

  if (ranked.length === 1 && isBoardEmpty(board)) {
    return toDecision(ranked[0], difficulty, 'opening', 0, 1)
  }

  const winningMove = ranked.find((candidate) => candidate.isWinning)
  if (winningMove) {
    return toDecision(winningMove, difficulty, 'win_now', 0, ranked.length)
  }

  const blockingMove = ranked.find((candidate) => candidate.isBlocking)
  if (blockingMove) {
    return toDecision(blockingMove, difficulty, 'forced_block', 0, ranked.length)
  }

  if (difficulty === 'easy') {
    // Easy still observes forced tactics, then deliberately allows positional errors.
    const pool = ranked.slice(0, Math.min(5, ranked.length))
    const random = options.random ?? Math.random
    const index = Math.min(pool.length - 1, Math.floor(clampUnit(random()) * pool.length))
    return toDecision(pool[index], difficulty, inferReason(pool[index]), 0, ranked.length)
  }

  if (difficulty === 'normal') {
    return toDecision(ranked[0], difficulty, inferReason(ranked[0]), 0, ranked.length)
  }

  // Search mutates and restores cells for speed; isolate that work from UI state.
  const searchBoard = cloneBoard(board)
  if (difficulty === 'master') {
    const forcingMove = findDoubleThreat(searchBoard, player, ranked.slice(0, 14))
    if (forcingMove) {
      return toDecision(forcingMove, difficulty, 'attack', 1, ranked.length)
    }
  }

  const config = SEARCH_CONFIG[difficulty]
  const timeLimitMs = Math.max(10, options.timeLimitMs ?? config.timeLimitMs)
  const context: SearchContext = {
    rootPlayer: player,
    deadline: Date.now() + timeLimitMs,
    candidateLimit: config.candidateLimit,
    shouldCancel: options.shouldCancel,
    nodes: 0,
    aborted: false,
  }

  let selected = ranked[0]
  let completedDepth = 0
  for (const depth of config.depths) {
    const result = searchRoot(searchBoard, player, ranked, depth, context)
    if (result.complete) {
      selected = { ...result.candidate, score: result.value }
      completedDepth = depth
    }
    if (!result.complete) break
  }

  return toDecision(
    selected,
    difficulty,
    inferReason(selected),
    completedDepth,
    context.nodes,
  )
}

/** Convenience API for game screens that only need board coordinates. */
export function getAIMove(
  board: Board,
  player: Stone,
  difficulty: AIDifficulty = 'normal',
  options: AIOptions = {},
): Position | null {
  return chooseAIMove(board, player, difficulty, options)?.position ?? null
}

export function getAIMoveForState(
  state: GameState,
  difficulty: AIDifficulty = 'normal',
  options: AIOptions = {},
): Position | null {
  if (state.status !== 'playing') return null
  return getAIMove(state.board, state.currentPlayer, difficulty, options)
}

function searchRoot(
  board: Board,
  player: Stone,
  ranked: CandidateScore[],
  depth: number,
  context: SearchContext,
): SearchResult {
  const candidates = ranked.slice(0, context.candidateLimit)
  let bestCandidate = candidates[0]
  let bestValue = Number.NEGATIVE_INFINITY

  for (const candidate of candidates) {
    if (mustStop(context)) {
      return { candidate: bestCandidate, value: bestValue, complete: false }
    }

    board[candidate.position.row][candidate.position.col] = player
    const value = minimax(
      board,
      otherPlayer(player),
      depth - 1,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      candidate.position,
      player,
      context,
      1,
    )
    board[candidate.position.row][candidate.position.col] = null

    if (context.aborted) {
      return { candidate: bestCandidate, value: bestValue, complete: false }
    }
    if (value > bestValue) {
      bestValue = value
      bestCandidate = candidate
    }
  }

  return { candidate: bestCandidate, value: bestValue, complete: true }
}

function minimax(
  board: Board,
  turn: Stone,
  depth: number,
  alphaValue: number,
  betaValue: number,
  lastMove: Position,
  lastPlayer: Stone,
  context: SearchContext,
  ply: number,
): number {
  context.nodes += 1
  if (mustStop(context)) return 0

  if (hasFiveFromPlacedStone(board, lastMove, lastPlayer)) {
    return lastPlayer === context.rootPlayer
      ? AI_WIN_SCORE - ply * 1_000
      : -AI_WIN_SCORE + ply * 1_000
  }
  if (depth <= 0 || isBoardFull(board)) return evaluateBoard(board, context.rootPlayer)

  const maximizing = turn === context.rootPlayer
  const candidates = rankCandidateMoves(board, turn, 'master', context.candidateLimit)
  if (candidates.length === 0) return 0

  let alpha = alphaValue
  let beta = betaValue
  let best = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    board[candidate.position.row][candidate.position.col] = turn
    const value = minimax(
      board,
      otherPlayer(turn),
      depth - 1,
      alpha,
      beta,
      candidate.position,
      turn,
      context,
      ply + 1,
    )
    board[candidate.position.row][candidate.position.col] = null

    if (context.aborted) return 0

    if (maximizing) {
      best = Math.max(best, value)
      alpha = Math.max(alpha, best)
    } else {
      best = Math.min(best, value)
      beta = Math.min(beta, best)
    }
    if (beta <= alpha) break
  }

  return best
}

function evaluateBoard(board: Board, rootPlayer: Stone): number {
  const candidates = getCandidatePositions(board)
  if (candidates.length === 0) return 0

  const opponent = otherPlayer(rootPlayer)
  let rootBest = 0
  let rootSecond = 0
  let opponentBest = 0
  let opponentSecond = 0

  for (const position of candidates) {
    const rootScore = evaluatePlacement(board, position, rootPlayer)
    const opponentScore = evaluatePlacement(board, position, opponent)
    ;[rootBest, rootSecond] = insertTopTwo(rootBest, rootSecond, rootScore)
    ;[opponentBest, opponentSecond] = insertTopTwo(
      opponentBest,
      opponentSecond,
      opponentScore,
    )
  }

  return rootBest + rootSecond * 0.35 - (opponentBest + opponentSecond * 0.35) * 1.06
}

function findDoubleThreat(
  board: Board,
  player: Stone,
  candidates: CandidateScore[],
): CandidateScore | null {
  for (const candidate of candidates) {
    board[candidate.position.row][candidate.position.col] = player
    let winningReplies = 0
    for (const reply of getCandidatePositions(board)) {
      if (isWinningPlacement(board, reply, player)) {
        winningReplies += 1
        if (winningReplies >= 2) break
      }
    }
    board[candidate.position.row][candidate.position.col] = null

    if (winningReplies >= 2) return candidate
  }
  return null
}

function hasFiveFromPlacedStone(
  board: Board,
  position: Position,
  player: Stone,
): boolean {
  return DIRECTIONS.some(([rowDelta, colDelta]) => {
    const forward = countSide(board, position, player, rowDelta, colDelta)
    const backward = countSide(board, position, player, -rowDelta, -colDelta)
    return 1 + forward.count + backward.count >= 5
  })
}

function countSide(
  board: Board,
  position: Position,
  player: Stone,
  rowDelta: number,
  colDelta: number,
): { count: number; open: boolean } {
  let row = position.row + rowDelta
  let col = position.col + colDelta
  let count = 0

  while (
    row >= 0 &&
    row < BOARD_SIZE &&
    col >= 0 &&
    col < BOARD_SIZE &&
    board[row][col] === player
  ) {
    count += 1
    row += rowDelta
    col += colDelta
  }

  return {
    count,
    open:
      row >= 0 &&
      row < BOARD_SIZE &&
      col >= 0 &&
      col < BOARD_SIZE &&
      board[row][col] === null,
  }
}

function scoreRun(length: number, openEnds: number): number {
  if (length >= 5) return AI_WIN_SCORE
  if (openEnds === 0) return 0

  if (length === 4) return openEnds === 2 ? 720_000 : 145_000
  if (length === 3) return openEnds === 2 ? 28_000 : 3_200
  if (length === 2) return openEnds === 2 ? 1_300 : 180
  return openEnds === 2 ? 42 : 10
}

/** Adds awareness of broken patterns such as XX.X that run counting misses. */
function scoreFiveCellWindows(
  board: Board,
  position: Position,
  player: Stone,
  rowDelta: number,
  colDelta: number,
): number {
  let score = 0

  for (let offset = -4; offset <= 0; offset += 1) {
    let stones = 0
    let valid = true

    for (let index = 0; index < 5; index += 1) {
      const row = position.row + (offset + index) * rowDelta
      const col = position.col + (offset + index) * colDelta
      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
        valid = false
        break
      }

      const cell = row === position.row && col === position.col ? player : board[row][col]
      if (cell === otherPlayer(player)) {
        valid = false
        break
      }
      if (cell === player) stones += 1
    }

    if (!valid) continue
    if (stones === 4) score += 42_000
    else if (stones === 3) score += 2_000
    else if (stones === 2) score += 160
  }

  return score
}

function compareCandidates(a: CandidateScore, b: CandidateScore): number {
  if (a.isWinning !== b.isWinning) return a.isWinning ? -1 : 1
  if (a.isBlocking !== b.isBlocking) return a.isBlocking ? -1 : 1
  if (a.score !== b.score) return b.score - a.score

  const center = Math.floor(BOARD_SIZE / 2)
  const aDistance = Math.abs(a.position.row - center) + Math.abs(a.position.col - center)
  const bDistance = Math.abs(b.position.row - center) + Math.abs(b.position.col - center)
  if (aDistance !== bDistance) return aDistance - bDistance
  if (a.position.row !== b.position.row) return a.position.row - b.position.row
  return a.position.col - b.position.col
}

function inferReason(candidate: CandidateScore): AIMoveReason {
  if (candidate.isWinning) return 'win_now'
  if (candidate.isBlocking) return 'forced_block'
  if (candidate.attackScore > candidate.defenseScore * 1.2) return 'attack'
  if (candidate.defenseScore > candidate.attackScore * 1.2) return 'defense'
  return 'positional'
}

function toDecision(
  candidate: CandidateScore,
  difficulty: AIDifficulty,
  reason: AIMoveReason,
  searchedDepth: number,
  nodes: number,
): AIDecision {
  return { ...candidate, difficulty, reason, searchedDepth, nodes }
}

function isEmptyPoint(board: Board, position: Position): boolean {
  return (
    Number.isInteger(position.row) &&
    Number.isInteger(position.col) &&
    position.row >= 0 &&
    position.row < BOARD_SIZE &&
    position.col >= 0 &&
    position.col < BOARD_SIZE &&
    board[position.row]?.[position.col] === null
  )
}

function isBoardEmpty(board: Board): boolean {
  return board.every((row) => row.every((cell) => cell === null))
}

function centerBonus(position: Position): number {
  const center = Math.floor(BOARD_SIZE / 2)
  return Math.max(0, 14 - (Math.abs(position.row - center) + Math.abs(position.col - center)))
}

function mustStop(context: SearchContext): boolean {
  if (
    context.aborted ||
    Date.now() >= context.deadline ||
    context.shouldCancel?.() === true
  ) {
    context.aborted = true
    return true
  }
  return false
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(0.999_999, value))
}

function insertTopTwo(best: number, second: number, value: number): [number, number] {
  if (value >= best) return [value, best]
  if (value > second) return [best, value]
  return [best, second]
}
