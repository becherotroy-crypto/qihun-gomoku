import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Lightbulb, RotateCcw, Settings, Sparkles, Undo2 } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { GameBoard } from '../components/GameBoard'
import type { GameState } from '../game/types'
import type { Difficulty, GameMode, PieceStyle, Player, Position, UserProfile } from '../types'

interface GameScreenProps {
  game: GameState
  mode: GameMode
  difficulty?: Difficulty
  profile: UserProfile
  playerColor: Player
  opponentName: string
  opponentAvatar: string
  aiThinking: boolean
  hint: Position | null
  elapsedSeconds: number
  pieceStyle: PieceStyle
  tutorialMessage?: string
  onPlace: (position: Position) => void
  onUndo: () => void
  onHint: () => void
  onRestart: () => void
  onExit: () => void
  onSettings: () => void
  onReview: () => void
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

function difficultyLabel(difficulty?: Difficulty) {
  return ({ easy: '简单', normal: '普通', hard: '困难', master: '大师' } as const)[difficulty ?? 'normal']
}

export function GameScreen({
  game,
  mode,
  difficulty,
  profile,
  playerColor,
  opponentName,
  opponentAvatar,
  aiThinking,
  hint,
  elapsedSeconds,
  pieceStyle,
  tutorialMessage,
  onPlace,
  onUndo,
  onHint,
  onRestart,
  onExit,
  onSettings,
  onReview,
}: GameScreenProps) {
  const gameOver = game.status !== 'playing'
  const isPlayerTurn = mode === 'local' || game.currentPlayer === playerColor
  const won = game.status === 'won' && game.winner === playerColor
  const resultTitle = game.status === 'draw' ? '棋逢对手' : won ? '胜局已定' : '再谋一局'
  const resultDetail = game.status === 'draw'
    ? `历经 ${game.moves.length} 手，双方握手言和`
    : won
      ? `第 ${game.moves.length} 手形成五连，棋力 +${difficulty === 'master' ? 48 : difficulty === 'hard' ? 36 : 24}`
      : `对手在第 ${game.moves.length} 手完成五连`

  const topPlayer = mode === 'local'
    ? { name: '白方棋手', avatar: '白', color: 'white' as Player, label: '本地玩家 2' }
    : { name: opponentName, avatar: opponentAvatar, color: playerColor === 'black' ? 'white' as Player : 'black' as Player, label: mode === 'online' ? '在线对手' : `AI · ${difficultyLabel(difficulty)}` }
  const bottomPlayer = { name: profile.nickname, avatar: profile.avatar, color: playerColor, label: mode === 'local' ? '本地玩家 1' : `Lv.${profile.level} · ${profile.title}` }

  return (
    <section className="game-screen">
      <header className="game-topbar">
        <button type="button" className="text-button" onClick={onExit}>退出</button>
        <div><span>{mode === 'daily' ? '每日残局' : mode === 'tutorial' ? '训练对局' : mode === 'online' ? '赛季对战' : '标准十五路'}</span><strong>{formatTime(elapsedSeconds)}</strong></div>
        <button type="button" className="icon-button" onClick={onSettings} aria-label="对局设置"><Settings size={20} /></button>
      </header>

      <div className="player-panel player-panel--top">
        <Avatar value={topPlayer.avatar} size="md" ring={game.currentPlayer === topPlayer.color && !gameOver} />
        <div className="player-panel__identity"><strong>{topPlayer.name}</strong><span>{topPlayer.label}</span></div>
        <div className={`turn-indicator${game.currentPlayer === topPlayer.color && !gameOver ? ' is-active' : ''}`}>
          <span className={`mini-piece mini-piece--${topPlayer.color}`} />
          {aiThinking && game.currentPlayer === topPlayer.color ? <span className="thinking-dots"><i /><i /><i /></span> : <strong>{game.currentPlayer === topPlayer.color && !gameOver ? '思考中' : '等待'}</strong>}
        </div>
      </div>

      <div className="game-board-area">
        {tutorialMessage && <motion.div className="tutorial-tip" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}><Lightbulb size={16} />{tutorialMessage}</motion.div>}
        <GameBoard
          board={game.board}
          onPlace={onPlace}
          lastMove={game.lastMove}
          winningLine={game.winningLine}
          disabled={gameOver || aiThinking || !isPlayerTurn}
          hint={hint}
          pieceStyle={pieceStyle}
        />
        <div className="board-caption"><span>黑方先行</span><strong>第 {game.moves.length + (gameOver ? 0 : 1)} 手</strong><span>{difficulty ? `${difficultyLabel(difficulty)}棋力` : '双人对弈'}</span></div>
      </div>

      <div className="player-panel player-panel--bottom">
        <Avatar value={bottomPlayer.avatar} size="md" ring={game.currentPlayer === bottomPlayer.color && !gameOver} />
        <div className="player-panel__identity"><strong>{bottomPlayer.name}</strong><span>{bottomPlayer.label}</span></div>
        <div className={`turn-indicator${game.currentPlayer === bottomPlayer.color && !gameOver ? ' is-active' : ''}`}>
          <span className={`mini-piece mini-piece--${bottomPlayer.color}`} />
          <strong>{game.currentPlayer === bottomPlayer.color && !gameOver ? '请落子' : '等待'}</strong>
        </div>
      </div>

      <div className="game-actions">
        <button type="button" onClick={onUndo} disabled={!game.moves.length || aiThinking || gameOver}><Undo2 size={21} /><span>悔棋</span></button>
        <button type="button" onClick={onHint} disabled={gameOver || aiThinking}><Lightbulb size={21} /><span>提示</span></button>
        <button type="button" onClick={onRestart}><RotateCcw size={21} /><span>重开</span></button>
        <button type="button" onClick={onSettings}><Settings size={21} /><span>设置</span></button>
      </div>

      <AnimatePresence>
        {gameOver && (
          <motion.div className="result-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="result-sheet" initial={{ y: 36, scale: 0.94 }} animate={{ y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
              {won && <div className="victory-rays" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ transform: `rotate(${index * 30}deg)` }} />)}</div>}
              <div className={`result-emblem${won ? ' is-win' : ''}`}><Sparkles size={28} /></div>
              <span className="result-kicker">{game.status === 'draw' ? 'DRAW' : won ? 'VICTORY' : 'GAME OVER'}</span>
              <h2>{resultTitle}</h2>
              <p>{resultDetail}</p>
              <div className="result-stats"><span><strong>{game.moves.length}</strong>总手数</span><span><strong>{formatTime(elapsedSeconds)}</strong>用时</span><span><strong>{mode === 'local' ? '双人' : difficultyLabel(difficulty)}</strong>难度</span></div>
              <button type="button" className="primary-button primary-button--center" onClick={onRestart}><RotateCcw size={19} /><strong>再来一局</strong></button>
              <button type="button" className="secondary-button" onClick={onReview}><Sparkles size={17} /> AI 复盘</button>
              <button type="button" className="quiet-button" onClick={onExit}>返回首页</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
