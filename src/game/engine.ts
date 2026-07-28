import {
  BOARD_SIZE,
  type Board,
  type Cell,
  type GameOutcome,
  type GameState,
  type Move,
  type MoveErrorCode,
  type MoveResult,
  type Position,
  type Stone,
  WIN_LENGTH,
} from './types'

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const

export class IllegalMoveError extends Error {
  readonly code: MoveErrorCode

  constructor(code: MoveErrorCode) {
    super(`Illegal Gomoku move: ${code}`)
    this.name = 'IllegalMoveError'
    this.code = code
  }
}

export function createBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array<Cell>(BOARD_SIZE).fill(null),
  )
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row])
}

export function createGameState(firstPlayer: Stone = 'black'): GameState {
  return {
    board: createBoard(),
    currentPlayer: firstPlayer,
    status: 'playing',
    winner: null,
    winningLine: [],
    moves: [],
    lastMove: null,
  }
}

export function otherPlayer(player: Stone): Stone {
  return player === 'black' ? 'white' : 'black'
}

export function isInsideBoard(position: Position): boolean {
  return (
    Number.isInteger(position.row) &&
    Number.isInteger(position.col) &&
    position.row >= 0 &&
    position.row < BOARD_SIZE &&
    position.col >= 0 &&
    position.col < BOARD_SIZE
  )
}

export function positionsEqual(a: Position | null, b: Position | null): boolean {
  return a !== null && b !== null && a.row === b.row && a.col === b.col
}

export function isBoardFull(board: Board): boolean {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row]?.[col] === null) return false
    }
  }
  return true
}

export function findWinningLine(
  board: Board,
  position: Position,
  player: Stone = board[position.row]?.[position.col] as Stone,
): Position[] {
  if (!isInsideBoard(position) || board[position.row][position.col] !== player) {
    return []
  }

  for (const [rowDelta, colDelta] of DIRECTIONS) {
    const before = collectDirection(board, position, player, -rowDelta, -colDelta)
    const after = collectDirection(board, position, player, rowDelta, colDelta)
    const line = [...before.reverse(), position, ...after]

    if (line.length >= WIN_LENGTH) return line
  }

  return []
}

export function hasWon(board: Board, position: Position, player?: Stone): boolean {
  const stone = player ?? board[position.row]?.[position.col]
  return stone !== null && stone !== undefined
    ? findWinningLine(board, position, stone).length >= WIN_LENGTH
    : false
}

/**
 * Evaluates arbitrary board data. Passing the last move avoids a full board scan.
 */
export function getGameOutcome(board: Board, lastMove?: Position): GameOutcome {
  if (lastMove && isInsideBoard(lastMove)) {
    const player = board[lastMove.row]?.[lastMove.col]
    if (player) {
      const winningLine = findWinningLine(board, lastMove, player)
      if (winningLine.length >= WIN_LENGTH) {
        return { status: 'won', winner: player, winningLine }
      }
    }
  } else {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const player = board[row]?.[col]
        if (!player) continue

        const winningLine = findWinningLine(board, { row, col }, player)
        if (winningLine.length >= WIN_LENGTH) {
          return { status: 'won', winner: player, winningLine }
        }
      }
    }
  }

  return isBoardFull(board)
    ? { status: 'draw', winner: null, winningLine: [] }
    : { status: 'playing', winner: null, winningLine: [] }
}

export function tryPlayMove(
  state: GameState,
  position: Position,
  player: Stone = state.currentPlayer,
): MoveResult {
  const error = validateMove(state, position, player)
  if (error) return { ok: false, state, error }

  const board = cloneBoard(state.board)
  board[position.row][position.col] = player

  const move: Move = {
    ...position,
    player,
    number: state.moves.length + 1,
  }
  const outcome = getGameOutcome(board, position)
  const nextState: GameState = {
    board,
    currentPlayer: otherPlayer(player),
    status: outcome.status,
    winner: outcome.winner,
    winningLine: outcome.winningLine,
    moves: [...state.moves, move],
    lastMove: move,
  }

  return { ok: true, state: nextState, move }
}

export function playMove(
  state: GameState,
  position: Position,
  player: Stone = state.currentPlayer,
): GameState {
  const result = tryPlayMove(state, position, player)
  if (!result.ok) throw new IllegalMoveError(result.error)
  return result.state
}

export function validateMove(
  state: GameState,
  position: Position,
  player: Stone = state.currentPlayer,
): MoveErrorCode | null {
  if (state.status !== 'playing') return 'game_over'
  if (!isInsideBoard(position)) return 'out_of_bounds'
  if (state.board[position.row][position.col] !== null) return 'occupied'
  if (player !== state.currentPlayer) return 'wrong_turn'
  return null
}

/** Rebuilds the state so outcome and move numbers can never become stale. */
export function replayMoves(
  moves: ReadonlyArray<Pick<Move, 'row' | 'col' | 'player'>>,
  firstPlayer: Stone = moves[0]?.player ?? 'black',
): GameState {
  let state = createGameState(firstPlayer)

  for (const move of moves) {
    state = playMove(state, { row: move.row, col: move.col }, move.player)
  }

  return state
}

export function undoMoves(state: GameState, count = 1): GameState {
  const normalizedCount = Math.max(0, Math.floor(count))
  if (normalizedCount === 0 || state.moves.length === 0) return state

  const retainedMoves = state.moves.slice(
    0,
    Math.max(0, state.moves.length - normalizedCount),
  )
  const firstPlayer = state.moves[0]?.player ?? 'black'
  return replayMoves(retainedMoves, firstPlayer)
}

export function undoLastMove(state: GameState): GameState {
  return undoMoves(state, 1)
}

function collectDirection(
  board: Board,
  origin: Position,
  player: Stone,
  rowDelta: number,
  colDelta: number,
): Position[] {
  const positions: Position[] = []
  let row = origin.row + rowDelta
  let col = origin.col + colDelta

  while (
    row >= 0 &&
    row < BOARD_SIZE &&
    col >= 0 &&
    col < BOARD_SIZE &&
    board[row][col] === player
  ) {
    positions.push({ row, col })
    row += rowDelta
    col += colDelta
  }

  return positions
}

