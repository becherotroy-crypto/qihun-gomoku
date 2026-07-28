import { ChevronLeft, Settings } from 'lucide-react'

interface TopBarProps {
  title?: string
  eyebrow?: string
  onBack?: () => void
  onSettings?: () => void
  right?: React.ReactNode
}

export function TopBar({ title, eyebrow, onBack, onSettings, right }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar__side">
        {onBack && (
          <button className="icon-button" type="button" onClick={onBack} aria-label="返回">
            <ChevronLeft size={24} />
          </button>
        )}
      </div>
      <div className="top-bar__title">
        {eyebrow && <span>{eyebrow}</span>}
        {title && <h1>{title}</h1>}
      </div>
      <div className="top-bar__side top-bar__side--right">
        {right}
        {onSettings && (
          <button className="icon-button" type="button" onClick={onSettings} aria-label="设置">
            <Settings size={21} />
          </button>
        )}
      </div>
    </header>
  )
}
