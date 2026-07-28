import { Award, ChevronRight, Flame, Gem, Settings, ShieldCheck, Sparkles, Target, Trophy } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import type { UserProfile } from '../types'

interface ProfileScreenProps {
  profile: UserProfile
  onSettings: () => void
  onEditProfile: () => void
}

const achievements = [
  { id: 'first-win', name: '初露锋芒', detail: '首次赢得对局', icon: Sparkles },
  { id: 'streak-5', name: '势如破竹', detail: '达成五连胜', icon: Flame },
  { id: 'games-20', name: '棋逢廿局', detail: '完成 20 场对局', icon: Target },
  { id: 'master-win', name: '越级挑战', detail: '击败大师 AI', icon: Gem },
]

export function ProfileScreen({ profile, onSettings, onEditProfile }: ProfileScreenProps) {
  const games = profile.wins + profile.losses + profile.draws
  const winRate = games ? Math.round((profile.wins / games) * 100) : 0
  const levelProgress = Math.min(100, Math.round((profile.experience % 1000) / 10))

  return (
    <section className="profile-screen page-pad">
      <header className="profile-top-actions">
        <div className="brand-mini">棋魂</div>
        <button type="button" className="icon-button" onClick={onSettings} aria-label="设置"><Settings size={21} /></button>
      </header>

      <div className="profile-identity">
        <button type="button" className="profile-avatar-button" onClick={onEditProfile} aria-label="编辑个人资料">
          <Avatar value={profile.avatar} size="xl" ring />
          <span>编辑</span>
        </button>
        <div>
          <h1>{profile.nickname}</h1>
          <p>ID {profile.id.toUpperCase()} · 入局第 28 天</p>
          <span className="rank-badge"><ShieldCheck size={14} /> {profile.title} · Lv.{profile.level}</span>
        </div>
      </div>

      <div className="level-progress">
        <div><span>距离 Lv.{profile.level + 1}</span><strong>{profile.experience % 1000} / 1000</strong></div>
        <span className="level-progress__track"><i style={{ width: `${levelProgress}%` }} /></span>
      </div>

      <div className="profile-stats">
        <div><strong>{games}</strong><span>总对局</span></div>
        <div><strong>{winRate}%</strong><span>胜率</span></div>
        <div><strong>{profile.bestStreak}</strong><span>最高连胜</span></div>
      </div>

      <section className="record-summary">
        <div className="section-heading"><h2>本赛季战绩</h2><span>夏至 · 第 6 周</span></div>
        <div className="record-ring-row">
          <div className="record-ring" style={{ '--win-rate': `${winRate * 3.6}deg` } as React.CSSProperties}>
            <span><strong>{winRate}%</strong><small>胜率</small></span>
          </div>
          <div className="record-bars">
            <div><span><i className="bar-dot bar-dot--win" />胜</span><strong>{profile.wins}</strong></div>
            <div><span><i className="bar-dot bar-dot--loss" />负</span><strong>{profile.losses}</strong></div>
            <div><span><i className="bar-dot bar-dot--draw" />和</span><strong>{profile.draws}</strong></div>
          </div>
          <div className="season-medal"><Trophy size={26} /><span>全服</span><strong>18%</strong></div>
        </div>
      </section>

      <section className="achievement-section">
        <div className="section-heading"><h2>成就</h2><button type="button">全部 <ChevronRight size={15} /></button></div>
        <div className="achievement-grid">
          {achievements.map(({ id, name, detail, icon: Icon }) => {
            const unlocked = profile.achievements.includes(id)
            return (
              <div className={`achievement-item${unlocked ? ' is-unlocked' : ''}`} key={id}>
                <span><Icon size={21} /></span>
                <div><strong>{name}</strong><small>{detail}</small></div>
                {unlocked && <Award size={15} />}
              </div>
            )
          })}
        </div>
      </section>
    </section>
  )
}
