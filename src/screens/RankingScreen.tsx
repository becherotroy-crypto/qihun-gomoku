import { Crown, Medal, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { SegmentedControl } from '../components/SegmentedControl'
import type { RankingPlayer } from '../types'

type RankingKind = 'rating' | 'winRate' | 'streak'

interface RankingScreenProps {
  rankings: RankingPlayer[]
}

export function RankingScreen({ rankings }: RankingScreenProps) {
  const [kind, setKind] = useState<RankingKind>('rating')
  const sorted = useMemo(() => [...rankings].sort((a, b) => {
    if (kind === 'winRate') return b.winRate - a.winRate
    if (kind === 'streak') return b.streak - a.streak
    return b.level * 100 + b.wins - (a.level * 100 + a.wins)
  }), [kind, rankings])

  const valueFor = (player: RankingPlayer) => {
    if (kind === 'winRate') return `${player.winRate}%`
    if (kind === 'streak') return `${player.streak} 连胜`
    return `${player.wins * 18 + player.level * 120}`
  }

  return (
    <section className="ranking-screen page-pad">
      <header className="page-header page-header--large">
        <span>赛季 · 夏至</span>
        <h1>棋坛风云榜</h1>
        <p>本赛季还有 12 天结束</p>
      </header>
      <SegmentedControl<RankingKind>
        label="排行榜类别"
        value={kind}
        onChange={setKind}
        options={[{ value: 'rating', label: '棋力' }, { value: 'winRate', label: '胜率' }, { value: 'streak', label: '连胜' }]}
      />

      <div className="podium" aria-label="前三名">
        {[sorted[1], sorted[0], sorted[2]].map((player, index) => player && (
          <div className={`podium__item podium__item--${index === 1 ? 'first' : index === 0 ? 'second' : 'third'}`} key={player.id}>
            <div className="podium__avatar">
              {index === 1 && <Crown size={22} />}
              <Avatar value={player.avatar} size={index === 1 ? 'xl' : 'lg'} ring />
              <i>{index === 1 ? 1 : index === 0 ? 2 : 3}</i>
            </div>
            <strong>{player.nickname}</strong>
            <span>{valueFor(player)}</span>
          </div>
        ))}
      </div>

      <div className="ranking-list">
        {sorted.slice(3).map((player, index) => (
          <div className={`ranking-row${player.isCurrentUser ? ' is-current' : ''}`} key={player.id}>
            <span className="ranking-row__rank">{index + 4}</span>
            <Avatar value={player.avatar} size="sm" />
            <div className="ranking-row__name"><strong>{player.nickname}</strong><span>Lv.{player.level} · {player.title}</span></div>
            <div className="ranking-row__value"><strong>{valueFor(player)}</strong><span><TrendingUp size={12} /> {player.winRate}%</span></div>
          </div>
        ))}
      </div>

      <div className="ranking-note"><Medal size={17} /><span>每日 00:00 更新赛季排名</span></div>
    </section>
  )
}
