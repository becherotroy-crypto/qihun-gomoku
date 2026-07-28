import { describe, expect, it } from 'vitest'
import {
  chooseAIMove,
  createBoard,
  createGameState,
  getBestMoveHint,
  type AIDifficulty,
} from '..'

const difficulties: AIDifficulty[] = ['easy', 'normal', 'hard', 'master']

describe('Gomoku AI', () => {
  it.each(difficulties)('%s completes its own open four', (difficulty) => {
    const board = createBoard()
    for (let col = 4; col <= 7; col += 1) board[7][col] = 'black'
    board[6][6] = 'white'

    const decision = chooseAIMove(board, 'black', difficulty, { random: () => 0 })

    expect(decision?.reason).toBe('win_now')
    expect(decision?.position.row).toBe(7)
    expect([3, 8]).toContain(decision?.position.col)
  })

  it.each(difficulties)('%s blocks an opponent open four', (difficulty) => {
    const board = createBoard()
    for (let col = 5; col <= 8; col += 1) board[9][col] = 'white'
    board[7][7] = 'black'

    const decision = chooseAIMove(board, 'black', difficulty, { random: () => 0 })

    expect(decision?.reason).toBe('forced_block')
    expect(decision?.position.row).toBe(9)
    expect([4, 9]).toContain(decision?.position.col)
  })

  it('opens in the center and exposes a hint contract', () => {
    const state = createGameState()
    const hint = getBestMoveHint(state)

    expect(hint?.position).toEqual({ row: 7, col: 7 })
    expect(hint?.reason).toBe('opening')
    expect(hint?.confidence).toBeGreaterThanOrEqual(0.5)
  })

  it('keeps master search bounded and never mutates the caller board', () => {
    const board = createBoard()
    const stones = [
      [7, 7, 'black'],
      [7, 8, 'white'],
      [8, 8, 'black'],
      [8, 7, 'white'],
      [6, 6, 'black'],
      [6, 8, 'white'],
      [9, 7, 'black'],
      [8, 6, 'white'],
      [5, 8, 'black'],
      [9, 9, 'white'],
    ] as const
    for (const [row, col, player] of stones) board[row][col] = player
    const snapshot = JSON.stringify(board)
    const startedAt = performance.now()

    const decision = chooseAIMove(board, 'black', 'master', { timeLimitMs: 35 })

    expect(decision).not.toBeNull()
    expect(performance.now() - startedAt).toBeLessThan(500)
    expect(JSON.stringify(board)).toBe(snapshot)
  })
})
