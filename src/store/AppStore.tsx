import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createDefaultDailyChallenge,
  createSeedRecords,
  DEFAULT_RANKINGS,
  DEFAULT_SETTINGS,
  DEFAULT_USER_PROFILE,
  getLocalDateKey,
} from '../data/seed'
import type {
  AppSettings,
  DailyChallengeState,
  GameRecord,
  RankingPlayer,
  UserProfile,
} from '../types'

const STORAGE_KEY = 'qihun-gomoku:app-state'
const STORAGE_VERSION = 1
const MAX_SAVED_GAMES = 120

interface AppState {
  profile: UserProfile
  settings: AppSettings
  records: GameRecord[]
  dailyChallenge: DailyChallengeState
}

interface PersistedAppState extends AppState {
  version: number
}

export interface DailyChallengeAttempt {
  completed: boolean
  score?: number
  recordId?: string
}

export interface AppStoreValue extends AppState {
  rankings: RankingPlayer[]
  totalGames: number
  winRate: number
  updateSettings: (changes: Partial<AppSettings>) => void
  resetSettings: () => void
  updateProfile: (changes: Partial<UserProfile>) => void
  saveGame: (record: GameRecord) => void
  deleteGame: (recordId: string) => void
  clearHistory: () => void
  recordDailyChallengeAttempt: (attempt: DailyChallengeAttempt) => void
  completeDailyChallenge: (score: number, recordId?: string) => void
  resetProgress: () => void
}

const AppStoreContext = createContext<AppStoreValue | null>(null)

function createInitialState(now = new Date()): AppState {
  return {
    profile: { ...DEFAULT_USER_PROFILE, achievements: [...DEFAULT_USER_PROFILE.achievements] },
    settings: { ...DEFAULT_SETTINGS },
    records: createSeedRecords(now),
    dailyChallenge: createDefaultDailyChallenge(now),
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function nonNegativeInteger(value: unknown, fallback: number): number {
  const number = finiteNumber(value, fallback)
  return number >= 0 ? Math.floor(number) : fallback
}

function hydrateProfile(value: unknown): UserProfile {
  if (!isObject(value)) return { ...DEFAULT_USER_PROFILE, achievements: [...DEFAULT_USER_PROFILE.achievements] }

  return {
    ...DEFAULT_USER_PROFILE,
    ...value,
    id: typeof value.id === 'string' ? value.id : DEFAULT_USER_PROFILE.id,
    nickname: typeof value.nickname === 'string' ? value.nickname : DEFAULT_USER_PROFILE.nickname,
    avatar: typeof value.avatar === 'string' ? value.avatar : DEFAULT_USER_PROFILE.avatar,
    title: typeof value.title === 'string' ? value.title : DEFAULT_USER_PROFILE.title,
    level: Math.max(1, nonNegativeInteger(value.level, DEFAULT_USER_PROFILE.level)),
    experience: nonNegativeInteger(value.experience, DEFAULT_USER_PROFILE.experience),
    wins: nonNegativeInteger(value.wins, DEFAULT_USER_PROFILE.wins),
    losses: nonNegativeInteger(value.losses, DEFAULT_USER_PROFILE.losses),
    draws: nonNegativeInteger(value.draws, DEFAULT_USER_PROFILE.draws),
    streak: nonNegativeInteger(value.streak, DEFAULT_USER_PROFILE.streak),
    bestStreak: nonNegativeInteger(value.bestStreak, DEFAULT_USER_PROFILE.bestStreak),
    achievements: Array.isArray(value.achievements)
      ? value.achievements.filter((item): item is string => typeof item === 'string')
      : [...DEFAULT_USER_PROFILE.achievements],
  }
}

function hydrateSettings(value: unknown): AppSettings {
  if (!isObject(value)) return { ...DEFAULT_SETTINGS }
  const boardThemes: AppSettings['boardTheme'][] = ['walnut', 'maple', 'ink']
  const pieceStyles: AppSettings['pieceStyle'][] = ['obsidian', 'jade', 'classic']
  const animationSpeeds: AppSettings['animationSpeed'][] = ['calm', 'standard', 'swift']

  return {
    sound: typeof value.sound === 'boolean' ? value.sound : DEFAULT_SETTINGS.sound,
    music: typeof value.music === 'boolean' ? value.music : DEFAULT_SETTINGS.music,
    boardTheme: boardThemes.includes(value.boardTheme as AppSettings['boardTheme'])
      ? value.boardTheme as AppSettings['boardTheme']
      : DEFAULT_SETTINGS.boardTheme,
    pieceStyle: pieceStyles.includes(value.pieceStyle as AppSettings['pieceStyle'])
      ? value.pieceStyle as AppSettings['pieceStyle']
      : DEFAULT_SETTINGS.pieceStyle,
    darkMode: typeof value.darkMode === 'boolean' ? value.darkMode : DEFAULT_SETTINGS.darkMode,
    animationSpeed: animationSpeeds.includes(value.animationSpeed as AppSettings['animationSpeed'])
      ? value.animationSpeed as AppSettings['animationSpeed']
      : DEFAULT_SETTINGS.animationSpeed,
    haptics: typeof value.haptics === 'boolean' ? value.haptics : DEFAULT_SETTINGS.haptics,
  }
}

function hydrateRecords(value: unknown): GameRecord[] {
  if (!Array.isArray(value)) return createSeedRecords()

  return value
    .filter(isGameRecord)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, MAX_SAVED_GAMES)
}

function isGameRecord(value: unknown): value is GameRecord {
  if (!isObject(value)) return false
  const modes: GameRecord['mode'][] = ['local', 'ai', 'daily', 'tutorial', 'online']
  const difficulties: NonNullable<GameRecord['difficulty']>[] = ['easy', 'normal', 'hard', 'master']
  const results: GameRecord['result'][] = ['black', 'white', 'draw', null]
  const players: GameRecord['playerColor'][] = ['black', 'white']

  return (
    typeof value.id === 'string'
    && value.id.length > 0
    && typeof value.mode === 'string'
    && modes.includes(value.mode as GameRecord['mode'])
    && (value.difficulty === undefined || difficulties.includes(value.difficulty as NonNullable<GameRecord['difficulty']>))
    && typeof value.date === 'string'
    && Number.isFinite(Date.parse(value.date))
    && typeof value.duration === 'number'
    && Number.isFinite(value.duration)
    && value.duration >= 0
    && results.includes(value.result as GameRecord['result'])
    && typeof value.opponent === 'string'
    && players.includes(value.playerColor as GameRecord['playerColor'])
    && Array.isArray(value.moves)
    && value.moves.every((move) => (
      isObject(move)
      && Number.isInteger(move.row)
      && finiteNumber(move.row, -1) >= 0
      && finiteNumber(move.row, 15) < 15
      && Number.isInteger(move.col)
      && finiteNumber(move.col, -1) >= 0
      && finiteNumber(move.col, 15) < 15
      && players.includes(move.player as GameRecord['playerColor'])
      && Number.isInteger(move.moveNumber)
      && finiteNumber(move.moveNumber, 0) > 0
      && typeof move.timestamp === 'number'
      && Number.isFinite(move.timestamp)
    ))
  )
}

function previousDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() - 1)
  return getLocalDateKey(date)
}

function hydrateDailyChallenge(value: unknown, now = new Date()): DailyChallengeState {
  const today = getLocalDateKey(now)
  if (!isObject(value)) return createDefaultDailyChallenge(now)

  const lastCompletedDate = typeof value.lastCompletedDate === 'string'
    ? value.lastCompletedDate
    : undefined
  const storedDate = typeof value.date === 'string' ? value.date : today
  const streak = nonNegativeInteger(value.streak, 0)

  if (storedDate !== today) {
    return {
      ...createDefaultDailyChallenge(now),
      streak: lastCompletedDate === previousDateKey(today) ? streak : 0,
      lastCompletedDate,
    }
  }

  return {
    date: today,
    completed: typeof value.completed === 'boolean' ? value.completed : false,
    attempts: nonNegativeInteger(value.attempts, 0),
    bestScore: nonNegativeInteger(value.bestScore, 0),
    streak,
    lastCompletedDate,
    recordId: typeof value.recordId === 'string' ? value.recordId : undefined,
  }
}

function hydrateState(value: unknown): AppState | null {
  if (!isObject(value)) return null

  return {
    profile: hydrateProfile(value.profile),
    settings: hydrateSettings(value.settings),
    records: hydrateRecords(value.records),
    dailyChallenge: hydrateDailyChallenge(value.dailyChallenge),
  }
}

function readStoredState(): AppState {
  if (typeof window === 'undefined') return createInitialState()

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState()
    return hydrateState(JSON.parse(raw)) ?? createInitialState()
  } catch {
    return createInitialState()
  }
}

function writeStoredState(state: AppState): void {
  if (typeof window === 'undefined') return

  try {
    const persisted: PersistedAppState = { version: STORAGE_VERSION, ...state }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
  } catch {
    // Storage can be unavailable in private mode; in-memory state remains usable.
  }
}

function titleForLevel(level: number): string {
  if (level >= 40) return '九段棋圣'
  if (level >= 34) return '八段国手'
  if (level >= 28) return '七段名人'
  if (level >= 22) return '六段棋士'
  if (level >= 16) return '弈林高手'
  if (level >= 10) return '登堂棋手'
  return '初入棋坛'
}

function withExperience(profile: UserProfile, gained: number): UserProfile {
  let level = profile.level
  let experience = profile.experience + gained

  while (experience >= 1_000) {
    experience -= 1_000
    level += 1
  }

  return { ...profile, level, experience, title: titleForLevel(level) }
}

function updateAchievements(profile: UserProfile): UserProfile {
  const totalGames = profile.wins + profile.losses + profile.draws
  const achievements = new Set(profile.achievements)
  if (profile.wins > 0) achievements.add('first-win')
  if (totalGames >= 20) achievements.add('games-20')
  if (profile.bestStreak >= 5) achievements.add('streak-5')
  return { ...profile, achievements: [...achievements] }
}

function applyGameResult(profile: UserProfile, record: GameRecord): UserProfile {
  if (record.result === null) return profile

  if (record.result === 'draw') {
    return updateAchievements(withExperience({
      ...profile,
      draws: profile.draws + 1,
      streak: 0,
    }, 12))
  }

  if (record.result === record.playerColor) {
    const streak = profile.streak + 1
    const updated = updateAchievements(withExperience({
      ...profile,
      wins: profile.wins + 1,
      streak,
      bestStreak: Math.max(profile.bestStreak, streak),
    }, 32))
    return record.mode === 'ai' && record.difficulty === 'master'
      ? { ...updated, achievements: [...new Set([...updated.achievements, 'master-win'])] }
      : updated
  }

  return updateAchievements(withExperience({
    ...profile,
    losses: profile.losses + 1,
    streak: 0,
  }, 8))
}

function createRankings(profile: UserProfile): RankingPlayer[] {
  const totalGames = profile.wins + profile.losses + profile.draws
  const winRate = totalGames > 0 ? Number(((profile.wins / totalGames) * 100).toFixed(1)) : 0

  return DEFAULT_RANKINGS.map((player) => player.isCurrentUser
    ? {
        ...player,
        id: profile.id,
        nickname: profile.nickname,
        avatar: profile.avatar,
        level: profile.level,
        title: profile.title,
        wins: profile.wins,
        winRate,
        streak: profile.streak,
      }
    : { ...player })
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(readStoredState)

  useEffect(() => {
    writeStoredState(state)
  }, [state])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      if (!event.newValue) {
        setState(createInitialState())
        return
      }
      try {
        const nextState = hydrateState(JSON.parse(event.newValue))
        if (nextState) setState(nextState)
      } catch {
        // Ignore malformed writes from another tab.
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    const refreshForCurrentDate = () => {
      if (document.visibilityState !== 'visible') return
      setState((current) => {
        const dailyChallenge = hydrateDailyChallenge(current.dailyChallenge)
        return dailyChallenge.date === current.dailyChallenge.date
          ? current
          : { ...current, dailyChallenge }
      })
    }

    document.addEventListener('visibilitychange', refreshForCurrentDate)
    return () => document.removeEventListener('visibilitychange', refreshForCurrentDate)
  }, [])

  const updateSettings = useCallback((changes: Partial<AppSettings>) => {
    setState((current) => ({
      ...current,
      settings: hydrateSettings({ ...current.settings, ...changes }),
    }))
  }, [])

  const resetSettings = useCallback(() => {
    setState((current) => ({ ...current, settings: { ...DEFAULT_SETTINGS } }))
  }, [])

  const updateProfile = useCallback((changes: Partial<UserProfile>) => {
    setState((current) => ({
      ...current,
      profile: hydrateProfile({ ...current.profile, ...changes }),
    }))
  }, [])

  const saveGame = useCallback((record: GameRecord) => {
    if (!isGameRecord(record)) return

    setState((current) => {
      const existingIndex = current.records.findIndex((item) => item.id === record.id)
      const existingRecord = existingIndex >= 0 ? current.records[existingIndex] : undefined
      const records = existingIndex >= 0
        ? current.records.map((item) => item.id === record.id ? record : item)
        : [record, ...current.records]
      const shouldApplyResult = existingIndex < 0
        || (existingRecord?.result === null && record.result !== null)

      return {
        ...current,
        profile: shouldApplyResult ? applyGameResult(current.profile, record) : current.profile,
        records: records
          .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
          .slice(0, MAX_SAVED_GAMES),
      }
    })
  }, [])

  const deleteGame = useCallback((recordId: string) => {
    setState((current) => ({
      ...current,
      records: current.records.filter((record) => record.id !== recordId),
    }))
  }, [])

  const clearHistory = useCallback(() => {
    setState((current) => ({ ...current, records: [] }))
  }, [])

  const recordDailyChallengeAttempt = useCallback((attempt: DailyChallengeAttempt) => {
    setState((current) => {
      const daily = hydrateDailyChallenge(current.dailyChallenge)
      const today = daily.date
      const firstCompletionToday = attempt.completed && daily.lastCompletedDate !== today
      const previousStreak = daily.lastCompletedDate === previousDateKey(today) ? daily.streak : 0

      return {
        ...current,
        dailyChallenge: {
          ...daily,
          completed: daily.completed || attempt.completed,
          attempts: daily.attempts + 1,
          bestScore: Math.max(daily.bestScore, Math.max(0, Math.floor(finiteNumber(attempt.score, 0)))),
          streak: firstCompletionToday ? previousStreak + 1 : daily.streak,
          lastCompletedDate: attempt.completed ? today : daily.lastCompletedDate,
          recordId: attempt.recordId ?? daily.recordId,
        },
      }
    })
  }, [])

  const completeDailyChallenge = useCallback((score: number, recordId?: string) => {
    recordDailyChallengeAttempt({ completed: true, score, recordId })
  }, [recordDailyChallengeAttempt])

  const resetProgress = useCallback(() => {
    const initialState = createInitialState()
    setState(initialState)
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        // The next state write still resets in-memory data.
      }
    }
  }, [])

  const value = useMemo<AppStoreValue>(() => {
    const totalGames = state.profile.wins + state.profile.losses + state.profile.draws
    return {
      ...state,
      rankings: createRankings(state.profile),
      totalGames,
      winRate: totalGames > 0 ? Number(((state.profile.wins / totalGames) * 100).toFixed(1)) : 0,
      updateSettings,
      resetSettings,
      updateProfile,
      saveGame,
      deleteGame,
      clearHistory,
      recordDailyChallengeAttempt,
      completeDailyChallenge,
      resetProgress,
    }
  }, [
    state,
    updateSettings,
    resetSettings,
    updateProfile,
    saveGame,
    deleteGame,
    clearHistory,
    recordDailyChallengeAttempt,
    completeDailyChallenge,
    resetProgress,
  ])

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useAppStore(): AppStoreValue {
  const store = useContext(AppStoreContext)
  if (!store) throw new Error('useAppStore must be used within AppStoreProvider')
  return store
}

export { STORAGE_KEY }
