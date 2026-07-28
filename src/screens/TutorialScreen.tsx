import { BookOpenCheck, Check, ChevronRight, CircleDot, Crown, Focus, Shield, Sparkles, Swords, Target } from 'lucide-react'
import { TopBar } from '../components/TopBar'

interface TutorialScreenProps {
  onBack: () => void
  onStartLesson: (lesson: number) => void
}

const lessons = [
  { title: '落子与连珠', detail: '认识棋盘、气与五连', icon: CircleDot, state: 'done' },
  { title: '活三与冲四', detail: '掌握最基础的进攻形态', icon: Target, state: 'current' },
  { title: '守住要点', detail: '识别对手的直接威胁', icon: Shield, state: 'open' },
  { title: '一子双杀', detail: '制造无法同时防守的棋形', icon: Swords, state: 'open' },
  { title: '空间与先手', detail: '让每一手保持主动', icon: Focus, state: 'locked' },
  { title: '禁手基础', detail: '了解竞技规则的边界', icon: BookOpenCheck, state: 'locked' },
  { title: '终局试炼', detail: '完成一盘完整挑战', icon: Crown, state: 'locked' },
]

export function TutorialScreen({ onBack, onStartLesson }: TutorialScreenProps) {
  return (
    <section className="tutorial-screen page-pad">
      <TopBar title="新手学堂" eyebrow="循序入门" onBack={onBack} />
      <div className="tutorial-progress-card">
        <span><Sparkles size={19} /></span>
        <div><strong>第二章 · 棋形初识</strong><small>已完成 1 / 7 课</small><i><b /></i></div>
        <strong>14%</strong>
      </div>
      <div className="lesson-path">
        {lessons.map(({ title, detail, icon: Icon, state }, index) => (
          <button
            type="button"
            key={title}
            className={`lesson-row lesson-row--${state}`}
            disabled={state === 'locked'}
            onClick={() => onStartLesson(index)}
          >
            <span className="lesson-row__line" aria-hidden="true" />
            <span className="lesson-row__index">{state === 'done' ? <Check size={17} /> : index + 1}</span>
            <span className="lesson-row__icon"><Icon size={22} /></span>
            <span className="lesson-row__copy"><strong>{title}</strong><small>{detail}</small></span>
            {state === 'current' && <span className="lesson-current">继续</span>}
            {state === 'open' && <ChevronRight size={18} />}
            {state === 'locked' && <span className="lesson-lock">未解锁</span>}
          </button>
        ))}
      </div>
    </section>
  )
}
