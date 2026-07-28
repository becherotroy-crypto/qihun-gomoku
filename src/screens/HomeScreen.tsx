import { motion } from 'framer-motion'
import {
  Bot,
  Check,
  ChevronRight,
  Flame,
  GraduationCap,
  Radio,
  Sparkles,
  Swords,
  UsersRound,
} from 'lucide-react'
import { Avatar } from '../components/Avatar'
import type { UserProfile } from '../types'

interface HomeScreenProps {
  profile: UserProfile
  onOpenProfile: () => void
  onStartAI: () => void
  onStartLocal: () => void
  onStartDaily: () => void
  onStartTutorial: () => void
  onOnline: () => void
  dailyCompleted: boolean
}

const entryMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

export function HomeScreen({
  profile,
  onOpenProfile,
  onStartAI,
  onStartLocal,
  onStartDaily,
  onStartTutorial,
  onOnline,
  dailyCompleted,
}: HomeScreenProps) {
  const games = profile.wins + profile.losses + profile.draws
  const winRate = games ? Math.round((profile.wins / games) * 100) : 0
  const today = new Date()
  const month = today.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  const day = today.getDate()

  return (
    <section className="home-screen page-pad">
      <motion.header className="home-header" {...entryMotion} transition={{ duration: 0.35 }}>
        <div className="brand-lockup">
          <div className="mini-mark" aria-hidden="true"><i /><i /></div>
          <div><span>棋魂</span><strong>五子棋</strong></div>
        </div>
        <button className="profile-chip" type="button" onClick={onOpenProfile} aria-label="打开个人中心">
          <div className="profile-chip__copy">
            <strong>{profile.nickname}</strong>
            <span>Lv.{profile.level} · {profile.title}</span>
          </div>
          <Avatar value={profile.avatar} size="md" ring />
        </button>
      </motion.header>

      <motion.section className="quick-play" {...entryMotion} transition={{ delay: 0.06, duration: 0.38 }}>
        <div className="quick-play__halo" aria-hidden="true"><i /><i /><i /></div>
        <div className="quick-play__copy">
          <span className="section-kicker"><Sparkles size={14} /> 快速对局</span>
          <h1>下一手，<br />决定棋局。</h1>
          <p>执黑先行 · 普通难度</p>
        </div>
        <button type="button" className="primary-button" onClick={onStartAI}>
          <span className="primary-button__icon"><Swords size={20} /></span>
          <span><strong>开始游戏</strong><small>人机对战</small></span>
          <ChevronRight size={20} />
        </button>
      </motion.section>

      <motion.div className="season-row" {...entryMotion} transition={{ delay: 0.1, duration: 0.35 }}>
        <div><span>本赛季</span><strong>{profile.wins} 胜</strong></div>
        <div><span>胜率</span><strong>{winRate}%</strong></div>
        <div><span>连胜</span><strong className="accent-text">{profile.streak}</strong></div>
      </motion.div>

      <motion.section className="mode-section" {...entryMotion} transition={{ delay: 0.14, duration: 0.4 }}>
        <div className="section-heading"><h2>对局模式</h2><span>选择你的战场</span></div>
        <div className="mode-grid">
          <button className="mode-card mode-card--featured" type="button" onClick={onStartAI}>
            <span className="mode-card__icon"><Bot size={23} /></span>
            <span><strong>人机对战</strong><small>四级智能棋力</small></span>
            <ChevronRight size={18} />
          </button>
          <button className="mode-card" type="button" onClick={onStartLocal}>
            <span className="mode-card__icon"><UsersRound size={22} /></span>
            <span><strong>双人对战</strong><small>同屏轮流落子</small></span>
            <ChevronRight size={18} />
          </button>
          <button className="mode-card" type="button" onClick={onOnline}>
            <span className="mode-card__icon"><Radio size={22} /></span>
            <span><strong>在线对战</strong><small>赛季匹配</small></span>
            <i className="live-dot" aria-label="在线" />
          </button>
          <button className="mode-card" type="button" onClick={onStartTutorial}>
            <span className="mode-card__icon"><GraduationCap size={22} /></span>
            <span><strong>新手学堂</strong><small>7 个进阶章节</small></span>
            <ChevronRight size={18} />
          </button>
        </div>
      </motion.section>

      <motion.button className={`daily-banner${dailyCompleted ? ' is-complete' : ''}`} type="button" onClick={onStartDaily} {...entryMotion} transition={{ delay: 0.18, duration: 0.42 }}>
        <span className="daily-banner__date"><small>{month}</small><strong>{day}</strong></span>
        <span className="daily-banner__copy"><strong>每日残局</strong><small>{dailyCompleted ? '今日挑战已完成 · 明日继续' : '白方一手制胜 · +120 棋力'}</small></span>
        <span className="daily-banner__flame">{dailyCompleted ? <Check size={19} /> : <Flame size={20} />} {dailyCompleted ? '已完成' : '今日'}</span>
      </motion.button>
    </section>
  )
}
