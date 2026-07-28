import { describe, expect, it } from 'vitest'
import {
  InvalidGameRecordError,
  createGameState,
  deserializeGame,
  playMove,
  serializeGame,
} from '..'

describe('game record serialization', () => {
  it('round-trips moves, outcome, and metadata', () => {
    let state = createGameState()
    state = playMove(state, { row: 7, col: 7 })
    state = playMove(state, { row: 7, col: 8 })
    state = playMove(state, { row: 8, col: 8 })

    const serialized = serializeGame(state, {
      id: 'game-42',
      mode: 'ai',
      difficulty: 'hard',
      players: [
        { id: 'me', nickname: '棋手', stone: 'black' },
        { nickname: '弈心', stone: 'white' },
      ],
    })
    const restored = deserializeGame(serialized)

    expect(restored.state).toEqual(state)
    expect(restored.metadata).toMatchObject({
      id: 'game-42',
      mode: 'ai',
      difficulty: 'hard',
    })
    expect(restored.metadata.players?.[0].nickname).toBe('棋手')
  })

  it('rejects a stored result that disagrees with its moves', () => {
    const serialized = serializeGame(createGameState())
    const record = JSON.parse(serialized) as Record<string, unknown>
    record.result = { status: 'won', winner: 'black' }

    expect(() => deserializeGame(JSON.stringify(record))).toThrow(InvalidGameRecordError)
  })
})

