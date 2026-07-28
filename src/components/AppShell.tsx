import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { House, ScrollText, Trophy, UserRound } from 'lucide-react'

export type MainTab = 'home' | 'records' | 'ranking' | 'profile'

interface AppShellProps {
  children: ReactNode
  activeTab: MainTab
  onTabChange: (tab: MainTab) => void
  hideNavigation?: boolean
  screenKey: string
}

const tabs: Array<{ id: MainTab; label: string; icon: typeof House }> = [
  { id: 'home', label: '首页', icon: House },
  { id: 'records', label: '棋谱', icon: ScrollText },
  { id: 'ranking', label: '排行', icon: Trophy },
  { id: 'profile', label: '我的', icon: UserRound },
]

export function AppShell({ children, activeTab, onTabChange, hideNavigation = false, screenKey }: AppShellProps) {
  return (
    <main className="app-frame">
      <div className="ambient-noise" aria-hidden="true" />
      <AnimatePresence mode="wait">
        <motion.div
          key={screenKey}
          className={`screen-container${hideNavigation ? ' screen-container--full' : ''}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {!hideNavigation && (
        <nav className="tab-bar" aria-label="主导航">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id
            return (
              <button
                type="button"
                key={id}
                className={`tab-bar__item${active ? ' is-active' : ''}`}
                onClick={() => onTabChange(id)}
                aria-current={active ? 'page' : undefined}
              >
                <span className="tab-bar__icon"><Icon size={21} strokeWidth={active ? 2.3 : 1.8} /></span>
                <span>{label}</span>
              </button>
            )
          })}
        </nav>
      )}
    </main>
  )
}
