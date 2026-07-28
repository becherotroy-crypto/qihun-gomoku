import { motion } from 'framer-motion'
import type { Cell, PieceStyle, Position } from '../types'

interface GameBoardProps {
  board: Cell[][]
  onPlace?: (position: Position) => void
  lastMove?: Position | null
  winningLine?: Position[]
  disabled?: boolean
  hint?: Position | null
  pieceStyle?: PieceStyle
  showNumbers?: boolean
  interactiveLabel?: string
}

const starPoints = new Set(['3-3', '3-11', '7-7', '11-3', '11-11'])

export function GameBoard({
  board,
  onPlace,
  lastMove,
  winningLine = [],
  disabled = false,
  hint,
  pieceStyle = 'obsidian',
  showNumbers = false,
  interactiveLabel = '五子棋棋盘',
}: GameBoardProps) {
  const winningKeys = new Set(winningLine.map(({ row, col }) => `${row}-${col}`))

  return (
    <div className="board-wrap">
      <div className="board-rim">
        <div className="game-board" role="grid" aria-label={interactiveLabel}>
          <div className="board-lines" aria-hidden="true" />
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const key = `${rowIndex}-${colIndex}`
              const isLast = lastMove?.row === rowIndex && lastMove?.col === colIndex
              const isHint = hint?.row === rowIndex && hint?.col === colIndex
              return (
                <button
                  type="button"
                  className={`board-cell${isHint ? ' is-hint' : ''}`}
                  key={key}
                  role="gridcell"
                  disabled={disabled || Boolean(cell)}
                  onClick={() => onPlace?.({ row: rowIndex, col: colIndex })}
                  aria-label={`${rowIndex + 1}行${colIndex + 1}列${cell ? (cell === 'black' ? '黑子' : '白子') : '空位'}`}
                >
                  {starPoints.has(key) && !cell && <span className="star-point" />}
                  {isHint && !cell && <motion.span className="hint-marker" initial={{ scale: 0 }} animate={{ scale: 1 }} />}
                  {cell && (
                    <motion.span
                      className={`stone stone--${cell} stone--${pieceStyle}${isLast ? ' is-last' : ''}${winningKeys.has(key) ? ' is-winning' : ''}`}
                      initial={{ scale: 1.55, y: -10, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 25, mass: 0.45 }}
                    >
                      {showNumbers && <span>{board.slice(0, rowIndex).flat().filter(Boolean).length + row.slice(0, colIndex).filter(Boolean).length + 1}</span>}
                    </motion.span>
                  )}
                </button>
              )
            }),
          )}
        </div>
      </div>
    </div>
  )
}
