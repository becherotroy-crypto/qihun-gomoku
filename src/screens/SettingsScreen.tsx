import { Check, ChevronRight, Moon, Music2, RotateCcw, SlidersHorizontal, Sparkles, Volume2, Waves } from 'lucide-react'
import { SegmentedControl } from '../components/SegmentedControl'
import { TopBar } from '../components/TopBar'
import type { AnimationSpeed, AppSettings, BoardTheme, PieceStyle } from '../types'

interface SettingsScreenProps {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
  onBack: () => void
  onReset: () => void
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      className={`switch-control${checked ? ' is-on' : ''}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  )
}

const boardThemes: Array<{ id: BoardTheme; name: string; color: string }> = [
  { id: 'walnut', name: '胡桃木', color: '#9a6737' },
  { id: 'maple', name: '枫木', color: '#d9ac67' },
  { id: 'ink', name: '玄墨', color: '#5b6461' },
]

const pieceStyles: Array<{ id: PieceStyle; name: string }> = [
  { id: 'obsidian', name: '曜石' },
  { id: 'jade', name: '玉脂' },
  { id: 'classic', name: '经典' },
]

export function SettingsScreen({ settings, onChange, onBack, onReset }: SettingsScreenProps) {
  return (
    <section className="settings-screen page-pad">
      <TopBar title="设置" onBack={onBack} />

      <div className="settings-group">
        <h2>声音与触感</h2>
        <div className="settings-list">
          <div className="setting-row">
            <span className="setting-row__icon"><Volume2 size={19} /></span>
            <div><strong>落子音效</strong><small>棋子触盘与胜负提示</small></div>
            <Toggle checked={settings.sound} onChange={(sound) => onChange({ sound })} label="落子音效" />
          </div>
          <div className="setting-row">
            <span className="setting-row__icon"><Music2 size={19} /></span>
            <div><strong>背景音乐</strong><small>沉浸式古琴氛围</small></div>
            <Toggle checked={settings.music} onChange={(music) => onChange({ music })} label="背景音乐" />
          </div>
          <div className="setting-row">
            <span className="setting-row__icon"><Waves size={19} /></span>
            <div><strong>触感反馈</strong><small>落子与按钮轻触震动</small></div>
            <Toggle checked={settings.haptics} onChange={(haptics) => onChange({ haptics })} label="触感反馈" />
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h2>棋盘主题</h2>
        <div className="theme-picker" role="radiogroup" aria-label="棋盘主题">
          {boardThemes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={settings.boardTheme === theme.id ? 'is-selected' : ''}
              onClick={() => onChange({ boardTheme: theme.id })}
              role="radio"
              aria-checked={settings.boardTheme === theme.id}
            >
              <span className={`board-swatch board-swatch--${theme.id}`} style={{ '--swatch-color': theme.color } as React.CSSProperties} />
              <strong>{theme.name}</strong>
              {settings.boardTheme === theme.id && <i><Check size={13} /></i>}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-group">
        <h2>棋子样式</h2>
        <div className="piece-picker" role="radiogroup" aria-label="棋子样式">
          {pieceStyles.map((style) => (
            <button
              key={style.id}
              type="button"
              className={settings.pieceStyle === style.id ? 'is-selected' : ''}
              onClick={() => onChange({ pieceStyle: style.id })}
              role="radio"
              aria-checked={settings.pieceStyle === style.id}
            >
              <span className={`piece-preview piece-preview--${style.id}`}><i /><i /></span>
              <strong>{style.name}</strong>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-group">
        <h2>显示与动画</h2>
        <div className="settings-list">
          <div className="setting-row">
            <span className="setting-row__icon"><Moon size={19} /></span>
            <div><strong>深色模式</strong><small>跟随棋魂深色外观</small></div>
            <Toggle checked={settings.darkMode} onChange={(darkMode) => onChange({ darkMode })} label="深色模式" />
          </div>
          <div className="setting-row setting-row--stacked">
            <span className="setting-row__icon"><SlidersHorizontal size={19} /></span>
            <div><strong>动画速度</strong><small>调整落子与转场节奏</small></div>
            <SegmentedControl<AnimationSpeed>
              label="动画速度"
              value={settings.animationSpeed}
              onChange={(animationSpeed) => onChange({ animationSpeed })}
              options={[{ value: 'calm', label: '从容' }, { value: 'standard', label: '标准' }, { value: 'swift', label: '利落' }]}
            />
          </div>
        </div>
      </div>

      <button type="button" className="settings-link" onClick={onReset}>
        <span><RotateCcw size={18} /> 恢复默认设置</span><ChevronRight size={18} />
      </button>
      <footer className="settings-footer"><Sparkles size={14} /><span>棋魂五子棋 1.0.0</span></footer>
    </section>
  )
}
