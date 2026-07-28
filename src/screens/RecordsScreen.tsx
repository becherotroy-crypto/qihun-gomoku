import { Bot, CalendarDays, ChevronRight, Clock3, Filter, Search, Swords, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SegmentedControl } from '../components/SegmentedControl'
import type { GameRecord } from '../types'

type RecordFilter = 'all' | 'win' | 'loss'

interface RecordsScreenProps {
  records: GameRecord[]
  onOpenRecord: (record: GameRecord) => void
}

function formatDate(value: string) {
  const date = new Date(value)
  const now = new Date()
  const today = date.toDateString() === now.toDateString()
  if (today) return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export function RecordsScreen({ records, onOpenRecord }: RecordsScreenProps) {
  const [filter, setFilter] = useState<RecordFilter>('all')
  const visibleRecords = useMemo(() => records.filter((record) => {
    if (filter === 'win') return record.result === record.playerColor
    if (filter === 'loss') return Boolean(record.result && record.result !== 'draw' && record.result !== record.playerColor)
    return true
  }), [filter, records])

  return (
    <section className="records-screen page-pad">
      <header className="page-header page-header--with-action">
        <div><span>落子有迹</span><h1>我的棋谱</h1><p>{records.length} 场对局已保存</p></div>
        <button type="button" className="icon-button" aria-label="搜索棋谱"><Search size={20} /></button>
      </header>

      <SegmentedControl<RecordFilter>
        label="棋谱筛选"
        value={filter}
        onChange={setFilter}
        options={[{ value: 'all', label: '全部' }, { value: 'win', label: '胜局' }, { value: 'loss', label: '败局' }]}
      />

      <div className="record-date-line"><CalendarDays size={15} /><span>最近对局</span><button type="button" aria-label="筛选"><Filter size={16} /></button></div>

      <div className="records-list">
        {visibleRecords.map((record) => {
          const won = record.result === record.playerColor
          const draw = record.result === 'draw'
          const ModeIcon = record.mode === 'local' ? UsersRound : record.mode === 'ai' ? Bot : Swords
          return (
            <button className="record-item" type="button" key={record.id} onClick={() => onOpenRecord(record)}>
              <span className={`record-item__result${won ? ' is-win' : draw ? ' is-draw' : ' is-loss'}`}>{won ? '胜' : draw ? '和' : '负'}</span>
              <span className="record-item__main">
                <strong><span className={`mini-piece mini-piece--${record.playerColor}`} /> 对阵 {record.opponent}</strong>
                <small><ModeIcon size={13} /> {record.mode === 'local' ? '本地双人' : record.mode === 'daily' ? '每日挑战' : `${record.difficulty ?? '普通'}难度`} · {record.moves.length} 手</small>
              </span>
              <span className="record-item__meta"><strong>{formatDate(record.date)}</strong><small><Clock3 size={12} /> {Math.max(1, Math.round(record.duration / 60))} 分钟</small></span>
              <ChevronRight size={17} />
            </button>
          )
        })}
        {!visibleRecords.length && (
          <div className="empty-state"><span className="empty-state__stones"><i /><i /></span><strong>暂无对应棋谱</strong><p>完成一局后，棋谱会自动保存在这里</p></div>
        )}
      </div>
    </section>
  )
}
