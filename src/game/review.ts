import {
  AI_WIN_SCORE,
  chooseAIMove,
  evaluatePlacement,
  isWinningPlacement,
  rankCandidateMoves,
} from './ai'
import { createGameState, otherPlayer, playMove, positionsEqual } from './engine'
import type {
  AIDecision,
  AIDifficulty,
  AIOptions,
  CandidateScore,
  GameState,
  Move,
  Position,
} from './types'

export interface MoveHint {
  position: Position
  reason: AIDecision['reason']
  confidence: number
  decision: AIDecision
  alternatives: CandidateScore[]
}

export type MoveQuality = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

export type ReviewTag =
  | 'opening'
  | 'winning_move'
  | 'forced_block'
  | 'missed_win'
  | 'missed_block'
  | 'turning_point'

export interface MoveAnalysis {
  move: Move
  quality: MoveQuality
  scoreLoss: number
  playedScore: number
  bestScore: number
  bestMove: Position | null
  tags: ReviewTag[]
  /** Stable semantic key; the presentation layer owns localized copy. */
  explanationKey:
    | 'opening_choice'
    | 'best_move'
    | 'strong_alternative'
    | 'small_loss'
    | 'large_loss'
    | 'converted_win'
    | 'found_only_block'
    | 'missed_immediate_win'
    | 'missed_immediate_block'
}

export interface GameReview {
  moves: MoveAnalysis[]
  keyMoments: MoveAnalysis[]
  summary: {
    best: number
    good: number
    inaccuracies: number
    mistakes: number
    blunders: number
    accuracy: number
  }
}

export interface ReviewOptions {
  maxKeyMoments?: number
}

export function getBestMoveHint(
  state: GameState,
  difficulty: AIDifficulty = 'hard',
  options: AIOptions = {},
): MoveHint | null {
  if (state.status !== 'playing') return null
  const decision = chooseAIMove(state.board, state.currentPlayer, difficulty, options)
  if (!decision) return null

  const alternatives = rankCandidateMoves(state.board, state.currentPlayer, difficulty, 4)
    .filter((candidate) => !positionsEqual(candidate.position, decision.position))
    .slice(0, 3)
  const runnerUpScore = alternatives[0]?.score ?? 0
  const tactical = decision.reason === 'win_now' || decision.reason === 'forced_block'
  const separation = Math.max(0, decision.score - runnerUpScore)
  const confidence = tactical
    ? 1
    : Math.max(0.52, Math.min(0.96, 0.58 + separation / Math.max(1, Math.abs(decision.score)) * 0.38))

  return {
    position: decision.position,
    reason: decision.reason,
    confidence,
    decision,
    alternatives,
  }
}

/**
 * Fast, deterministic review intended for immediate on-device feedback. It uses
 * tactical and heuristic loss instead of running a full search for every ply.
 */
export function analyzeGame(
  game: GameState | ReadonlyArray<Move>,
  options: ReviewOptions = {},
): GameReview {
  const moves: ReadonlyArray<Move> = Array.isArray(game)
    ? game
    : (game as GameState).moves
  let state = createGameState(moves[0]?.player ?? 'black')
  const analyses: MoveAnalysis[] = []

  for (const move of moves) {
    if (state.status !== 'playing') break
    const analysis = analyzeMove(state, move)
    analyses.push(analysis)
    state = playMove(state, move, move.player)
  }

  const maxKeyMoments = Math.max(1, Math.floor(options.maxKeyMoments ?? 8))
  const keyMoments = analyses
    .filter(
      (analysis) =>
        analysis.tags.length > 0 ||
        analysis.quality === 'mistake' ||
        analysis.quality === 'blunder',
    )
    .sort(compareKeyMoments)
    .slice(0, maxKeyMoments)
    .sort((a, b) => a.move.number - b.move.number)

  const counts = {
    best: analyses.filter((item) => item.quality === 'best').length,
    good: analyses.filter((item) => item.quality === 'good').length,
    inaccuracies: analyses.filter((item) => item.quality === 'inaccuracy').length,
    mistakes: analyses.filter((item) => item.quality === 'mistake').length,
    blunders: analyses.filter((item) => item.quality === 'blunder').length,
  }
  const penalty =
    counts.inaccuracies * 0.08 + counts.mistakes * 0.24 + counts.blunders * 0.48
  const accuracy =
    analyses.length === 0
      ? 100
      : Math.round(Math.max(0, 1 - penalty / analyses.length) * 100)

  return { moves: analyses, keyMoments, summary: { ...counts, accuracy } }
}

export const reviewGame = analyzeGame

function analyzeMove(state: GameState, move: Move): MoveAnalysis {
  const ranked = rankCandidateMoves(state.board, move.player, 'hard')
  const best = ranked[0] ?? null
  const played =
    ranked.find((candidate) => positionsEqual(candidate.position, move)) ??
    scorePlayedMove(state, move)
  const bestScore = best?.score ?? played.score
  const scoreLoss = Math.max(0, bestScore - played.score)
  const missedWin = best?.isWinning === true && !played.isWinning
  const missedBlock = best?.isBlocking === true && !played.isBlocking

  let quality: MoveQuality
  if (missedWin || missedBlock) quality = 'blunder'
  else if (played.isWinning || positionsEqual(best?.position ?? null, move)) quality = 'best'
  else {
    const ratio = bestScore <= 0 ? 1 : played.score / bestScore
    if (ratio >= 0.72) quality = 'good'
    else if (ratio >= 0.38) quality = 'inaccuracy'
    else if (ratio >= 0.12) quality = 'mistake'
    else quality = 'blunder'
  }

  const tags: ReviewTag[] = []
  if (move.number <= 2) tags.push('opening')
  if (played.isWinning) tags.push('winning_move')
  if (played.isBlocking) tags.push('forced_block')
  if (missedWin) tags.push('missed_win', 'turning_point')
  if (missedBlock) tags.push('missed_block', 'turning_point')
  if ((quality === 'mistake' || quality === 'blunder') && !tags.includes('turning_point')) {
    tags.push('turning_point')
  }

  return {
    move,
    quality,
    scoreLoss,
    playedScore: played.score,
    bestScore,
    bestMove: best?.position ?? null,
    tags,
    explanationKey: getExplanationKey(quality, played, missedWin, missedBlock, move.number),
  }
}

function scorePlayedMove(state: GameState, move: Move): CandidateScore {
  const attackScore = evaluatePlacement(state.board, move, move.player)
  const defenseScore = evaluatePlacement(state.board, move, otherPlayer(move.player))
  return {
    position: { row: move.row, col: move.col },
    attackScore,
    defenseScore,
    isWinning: isWinningPlacement(state.board, move, move.player),
    isBlocking: isWinningPlacement(state.board, move, otherPlayer(move.player)),
    score: attackScore + defenseScore * 1.06,
  }
}

function getExplanationKey(
  quality: MoveQuality,
  played: CandidateScore,
  missedWin: boolean,
  missedBlock: boolean,
  moveNumber: number,
): MoveAnalysis['explanationKey'] {
  if (missedWin) return 'missed_immediate_win'
  if (missedBlock) return 'missed_immediate_block'
  if (played.isWinning || played.attackScore >= AI_WIN_SCORE) return 'converted_win'
  if (played.isBlocking) return 'found_only_block'
  if (moveNumber <= 2) return 'opening_choice'
  if (quality === 'best') return 'best_move'
  if (quality === 'good') return 'strong_alternative'
  if (quality === 'inaccuracy') return 'small_loss'
  return 'large_loss'
}

function compareKeyMoments(a: MoveAnalysis, b: MoveAnalysis): number {
  const severity: Record<MoveQuality, number> = {
    best: 0,
    good: 1,
    inaccuracy: 2,
    mistake: 3,
    blunder: 4,
  }
  const tacticalA = a.tags.some((tag) => tag === 'winning_move' || tag === 'forced_block') ? 1 : 0
  const tacticalB = b.tags.some((tag) => tag === 'winning_move' || tag === 'forced_block') ? 1 : 0
  return severity[b.quality] - severity[a.quality] || tacticalB - tacticalA || b.scoreLoss - a.scoreLoss
}
