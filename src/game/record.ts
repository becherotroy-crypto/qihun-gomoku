import { BOARD_SIZE, type AIDifficulty, type GameState, type Stone } from './types'
import { createGameState, playMove } from './engine'

export type GameMode = 'local' | 'ai' | 'online' | 'daily' | 'tutorial'

export interface PlayerSnapshot {
  id?: string
  nickname: string
  avatar?: string
  stone: Stone
}

export interface GameRecordMetadata {
  id?: string
  title?: string
  createdAt?: string
  finishedAt?: string
  mode?: GameMode
  difficulty?: AIDifficulty
  players?: PlayerSnapshot[]
}

export interface SerializedMoveV1 {
  r: number
  c: number
  p: 'b' | 'w'
}

export interface GameRecordV1 {
  schema: 'qihun-gomoku'
  version: 1
  boardSize: 15
  firstPlayer: Stone
  moves: SerializedMoveV1[]
  result: {
    status: GameState['status']
    winner: Stone | null
  }
  metadata: GameRecordMetadata
}

export interface RestoredGame {
  state: GameState
  metadata: GameRecordMetadata
  record: GameRecordV1
}

export class InvalidGameRecordError extends Error {
  constructor(message: string) {
    super(`Invalid game record: ${message}`)
    this.name = 'InvalidGameRecordError'
  }
}

export function createGameRecord(
  state: GameState,
  metadata: GameRecordMetadata = {},
): GameRecordV1 {
  return {
    schema: 'qihun-gomoku',
    version: 1,
    boardSize: BOARD_SIZE,
    firstPlayer: state.moves[0]?.player ?? state.currentPlayer,
    moves: state.moves.map((move) => ({
      r: move.row,
      c: move.col,
      p: move.player === 'black' ? 'b' : 'w',
    })),
    result: { status: state.status, winner: state.winner },
    metadata: cloneMetadata(metadata),
  }
}

export function serializeGame(
  state: GameState,
  metadata: GameRecordMetadata = {},
  pretty = false,
): string {
  return JSON.stringify(createGameRecord(state, metadata), null, pretty ? 2 : undefined)
}

export function deserializeGame(serialized: string): RestoredGame {
  let parsed: unknown
  try {
    parsed = JSON.parse(serialized)
  } catch {
    throw new InvalidGameRecordError('JSON could not be parsed')
  }

  return restoreGameRecord(parsed)
}

export function restoreGameRecord(input: unknown): RestoredGame {
  const record = validateRecord(input)
  let state = createGameState(record.firstPlayer)

  try {
    for (const move of record.moves) {
      state = playMove(
        state,
        { row: move.r, col: move.c },
        move.p === 'b' ? 'black' : 'white',
      )
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'illegal move sequence'
    throw new InvalidGameRecordError(detail)
  }

  if (state.status !== record.result.status || state.winner !== record.result.winner) {
    throw new InvalidGameRecordError('stored result does not match the move sequence')
  }

  return {
    state,
    metadata: cloneMetadata(record.metadata),
    record,
  }
}

function validateRecord(input: unknown): GameRecordV1 {
  if (!isObject(input)) throw new InvalidGameRecordError('root must be an object')
  if (input.schema !== 'qihun-gomoku') {
    throw new InvalidGameRecordError('unsupported schema')
  }
  if (input.version !== 1) throw new InvalidGameRecordError('unsupported version')
  if (input.boardSize !== BOARD_SIZE) {
    throw new InvalidGameRecordError('unsupported board size')
  }
  if (!isStone(input.firstPlayer)) {
    throw new InvalidGameRecordError('invalid first player')
  }
  if (!Array.isArray(input.moves) || input.moves.length > BOARD_SIZE * BOARD_SIZE) {
    throw new InvalidGameRecordError('invalid move list')
  }

  const moves: SerializedMoveV1[] = input.moves.map((move, index) => {
    if (!isObject(move)) {
      throw new InvalidGameRecordError(`move ${index + 1} must be an object`)
    }
    if (
      !Number.isInteger(move.r) ||
      !Number.isInteger(move.c) ||
      (move.p !== 'b' && move.p !== 'w') ||
      (move.r as number) < 0 ||
      (move.r as number) >= BOARD_SIZE ||
      (move.c as number) < 0 ||
      (move.c as number) >= BOARD_SIZE
    ) {
      throw new InvalidGameRecordError(`move ${index + 1} is invalid`)
    }
    return { r: move.r as number, c: move.c as number, p: move.p }
  })

  if (!isObject(input.result)) throw new InvalidGameRecordError('invalid result')
  if (
    input.result.status !== 'playing' &&
    input.result.status !== 'won' &&
    input.result.status !== 'draw'
  ) {
    throw new InvalidGameRecordError('invalid result status')
  }
  if (input.result.winner !== null && !isStone(input.result.winner)) {
    throw new InvalidGameRecordError('invalid winner')
  }
  if (
    (input.result.status === 'won' && input.result.winner === null) ||
    (input.result.status !== 'won' && input.result.winner !== null)
  ) {
    throw new InvalidGameRecordError('winner and status disagree')
  }

  const metadata = validateMetadata(input.metadata)

  return {
    schema: 'qihun-gomoku',
    version: 1,
    boardSize: BOARD_SIZE,
    firstPlayer: input.firstPlayer,
    moves,
    result: {
      status: input.result.status,
      winner: input.result.winner,
    },
    metadata,
  }
}

function validateMetadata(input: unknown): GameRecordMetadata {
  if (input === undefined) return {}
  if (!isObject(input)) throw new InvalidGameRecordError('metadata must be an object')

  const metadata: GameRecordMetadata = {}
  for (const key of ['id', 'title', 'createdAt', 'finishedAt'] as const) {
    const value = input[key]
    if (value !== undefined && typeof value !== 'string') {
      throw new InvalidGameRecordError(`metadata.${key} must be a string`)
    }
    if (typeof value === 'string') metadata[key] = value
  }

  if (input.mode !== undefined) {
    if (!['local', 'ai', 'online', 'daily', 'tutorial'].includes(input.mode as string)) {
      throw new InvalidGameRecordError('invalid game mode')
    }
    metadata.mode = input.mode as GameMode
  }
  if (input.difficulty !== undefined) {
    if (!['easy', 'normal', 'hard', 'master'].includes(input.difficulty as string)) {
      throw new InvalidGameRecordError('invalid AI difficulty')
    }
    metadata.difficulty = input.difficulty as AIDifficulty
  }
  if (input.players !== undefined) {
    if (!Array.isArray(input.players) || input.players.length > 2) {
      throw new InvalidGameRecordError('invalid players')
    }
    metadata.players = input.players.map((player, index) => validatePlayer(player, index))
  }

  return metadata
}

function validatePlayer(input: unknown, index: number): PlayerSnapshot {
  if (!isObject(input) || typeof input.nickname !== 'string' || !isStone(input.stone)) {
    throw new InvalidGameRecordError(`player ${index + 1} is invalid`)
  }
  if (input.id !== undefined && typeof input.id !== 'string') {
    throw new InvalidGameRecordError(`player ${index + 1} id is invalid`)
  }
  if (input.avatar !== undefined && typeof input.avatar !== 'string') {
    throw new InvalidGameRecordError(`player ${index + 1} avatar is invalid`)
  }

  return {
    nickname: input.nickname,
    stone: input.stone,
    ...(typeof input.id === 'string' ? { id: input.id } : {}),
    ...(typeof input.avatar === 'string' ? { avatar: input.avatar } : {}),
  }
}

function cloneMetadata(metadata: GameRecordMetadata): GameRecordMetadata {
  return {
    ...metadata,
    players: metadata.players?.map((player) => ({ ...player })),
  }
}

function isStone(value: unknown): value is Stone {
  return value === 'black' || value === 'white'
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

