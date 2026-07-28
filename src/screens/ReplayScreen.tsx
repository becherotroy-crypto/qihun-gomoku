import { ChevronLeft, ChevronRight, Lightbulb, RotateCcw, Share2, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { GameBoard } from '../components/GameBoard'
import { TopBar } from '../components/TopBar'
import type { Cell, GameRecord, Position } from '../types'

interface ReplayInsight {
  moveNumber: number
  tone: 'good' | 'warning' | 'best'
  title: string
  detail: string
  position?: Position
}

interface ReplayScreenProps {
  record: GameRecord
  insights: ReplayInsight[]
  onBack: () => void
  onShare: () => void
}

function boardAt(record: GameRecord, step: number): Cell[][] {
  const board: Cell[][] = Array.from({ length: 15 }, () => Array<Cell>(15).fill(null))
  record.moves.slice(0, step).forEach((move) => { board[move.row][move.col] = move.player })
  return board
}

export function ReplayScreen({ record, insights, onBack, onShare }: ReplayScreenProps) {
  const [step, setStep] = useState(record.moves.length)
  const [activeInsight, setActiveInsight] = useState<ReplayInsight | null>(null)
  const board = useMemo(() => boardAt(record, step), [record, step])
  const lastMove = step ? record.moves[step - 1] : null
  const currentInsight = activeInsight ?? insights.find((item) => item.moveNumber === step) ?? null

  const jumpToInsight = (insight: ReplayInsight) => {
    setStep(insight.moveNumber)
    setActiveInsight(insight)
  }

  return (
    <section className="replay-screen page-pad">
      <TopBar
        eyebrow="AI 复盘"
        title={`${record.opponent} · ${record.moves.length} 手`}
        onBack={onBack}
        right={<button type="button" className="icon-button" onClick={onShare} aria-label="分享棋谱"><Share2 size={20} /></button>}
      />

      <div className="replay-score">
        <div><span>黑方胜率</span><strong>{step ? Math.max(12, Math.min(88, 50 + (record.moves[step - 1]?.evaluation ?? 0))) : 50}%</strong></div>
        <span className="replay-score__bar"><i style={{ width: `${step ? Math.max(12, Math.min(88, 50 + (record.moves[step - 1]?.evaluation ?? 0))) : 50}%` }} /></span>
        <div><strong>{100 - (step ? Math.max(12, Math.min(88, 50 + (record.moves[step - 1]?.evaluation ?? 0))) : 50)}%</strong><span>白方胜率</span></div>
      </div>

      <GameBoard board={board} lastMove={lastMove} hint={currentInsight?.position ?? null} showNumbers={false} disabled interactiveLabel="棋谱复盘棋盘" />

      <div className="replay-controls">
        <button type="button" className="icon-button" onClick={() => setStep(0)} aria-label="回到开局"><RotateCcw size={18} /></button>
        <button type="button" className="round-control" onClick={() => setStep((value) => Math.max(0, value - 1))} aria-label="上一步"><ChevronLeft size={24} /></button>
        <div><strong>{step}</strong><span>/ {record.moves.length}</span></div>
        <button type="button" className="round-control" onClick={() => setStep((value) => Math.min(record.moves.length, value + 1))} aria-label="下一步"><ChevronRight size={24} /></button>
        <button type="button" className="icon-button" onClick={() => setStep(record.moves.length)} aria-label="跳到终局"><Sparkles size={18} /></button>
      </div>
      <input
        className="replay-slider"
        type="range"
        min="0"
        max={record.moves.length}
        value={step}
        onChange={(event) => setStep(Number(event.target.value))}
        aria-label="棋谱进度"
      />

      <section className="insight-section">
        <div className="section-heading"><h2><Sparkles size={17} /> AI 关键分析</h2><span>{insights.length} 个关键节点</span></div>
        {currentInsight && (
          <div className={`active-insight active-insight--${currentInsight.tone}`}>
            <span><Lightbulb size={19} /></span>
            <div><strong>第 {currentInsight.moveNumber} 手 · {currentInsight.title}</strong><p>{currentInsight.detail}</p></div>
          </div>
        )}
        <div className="insight-chips">
          {insights.map((insight) => (
            <button type="button" key={`${insight.moveNumber}-${insight.title}`} className={step === insight.moveNumber ? 'is-active' : ''} onClick={() => jumpToInsight(insight)}>
              <span className={`insight-dot insight-dot--${insight.tone}`} />{insight.moveNumber} 手
            </button>
          ))}
        </div>
      </section>
    </section>
  )
}
