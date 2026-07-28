import { describe, expect, it } from 'vitest'
import {
  createBoard,
  createGameState,
  getGameOutcome,
  playMove,
  tryPlayMove,
  undoLastMove,
  type GameState,
  type Position,
  type Stone,
} from '..'

function playBlackLine(blackMoves: Position[]): GameState {
  let state = createGameState()
  const whiteFillers: Position[] = [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 0, col: 4 },
    { row: 0, col: 6 },
  ]

  blackMoves.forEach((move, index) => {
    state = playMove(state, move)
    if (index < blackMoves.length - 1) state = playMove(state, whiteFillers[index])
  })
  return state
}

describe('Gomoku rules', () => {
  it.each([
    {
      name: 'horizontal',
      moves: [
        { row: 7, col: 3 },
        { row: 7, col: 4 },
        { row: 7, col: 5 },
        { row: 7, col: 6 },
        { row: 7, col: 7 },
      ],
    },
    {
      name: 'vertical',
      moves: [
        { row: 4, col: 8 },
        { row: 5, col: 8 },
        { row: 6, col: 8 },
        { row: 7, col: 8 },
        { row: 8, col: 8 },
      ],
    },
    {
      name: 'downward diagonal',
      moves: [
        { row: 4, col: 4 },
        { row: 5, col: 5 },
        { row: 6, col: 6 },
        { row: 7, col: 7 },
        { row: 8, col: 8 },
      ],
    },
    {
      name: 'upward diagonal',
      moves: [
        { row: 8, col: 4 },
        { row: 7, col: 5 },
        { row: 6, col: 6 },
        { row: 5, col: 7 },
        { row: 4, col: 8 },
      ],
    },
  ])('detects a $name five', ({ moves }) => {
    const state = playBlackLine(moves)

    expect(state.status).toBe('won')
    expect(state.winner).toBe('black')
    expect(state.winningLine).toHaveLength(5)
    expect(state.lastMove).toMatchObject(moves[4])
  })

  it('marks a full board without a five as a draw', () => {
    // This period-four pattern has maximum runs of two in every direction.
    const board = createBoard()
    for (let row = 0; row < 15; row += 1) {
      for (let col = 0; col < 15; col += 1) {
        board[row][col] = (2 * row + col) % 4 < 2 ? 'black' : 'white'
      }
    }
    board[7][7] = null

    expect(getGameOutcome(board).status).toBe('playing')

    const partialState: GameState = {
      board,
      currentPlayer: 'black',
      status: 'playing',
      winner: null,
      winningLine: [],
      moves: [],
      lastMove: null,
    }
    const state = playMove(partialState, { row: 7, col: 7 })
    expect(state.status).toBe('draw')
    expect(state.winner).toBeNull()
  })

  it('restores a playable state after undoing the winning move', () => {
    const won = playBlackLine([
      { row: 9, col: 3 },
      { row: 9, col: 4 },
      { row: 9, col: 5 },
      { row: 9, col: 6 },
      { row: 9, col: 7 },
    ])
    const undone = undoLastMove(won)

    expect(undone.status).toBe('playing')
    expect(undone.currentPlayer).toBe('black')
    expect(undone.board[9][7]).toBeNull()
    expect(undone.moves).toHaveLength(8)
  })

  it('returns explicit errors without mutating state', () => {
    const initial = createGameState()
    const played = playMove(initial, { row: 7, col: 7 })
    const result = tryPlayMove(played, { row: 7, col: 7 })

    expect(result).toMatchObject({ ok: false, error: 'occupied', state: played })
    expect(initial.board[7][7]).toBeNull()
    expect(played.board[7][7]).toBe<Stone>('black')
  })
})

