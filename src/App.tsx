import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Check, Circle, Crown, LoaderCircle, Shield, Sparkles, Swords, Zap } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { AppShell, type MainTab } from './components/AppShell'
import { Avatar } from './components/Avatar'
import { Modal } from './components/Modal'
import { SegmentedControl } from './components/SegmentedControl'
import {
  analyzeGame,
  chooseAIMove,
  createGameState,
  getBestMoveHint,
  playMove,
  replayMoves,
  tryPlayMove,
  undoMoves,
  type GameState,
  type MoveAnalysis,
} from './game'
import { GameScreen } from './screens/GameScreen'
import { HomeScreen } from './screens/HomeScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { RankingScreen } from './screens/RankingScreen'
import { RecordsScreen } from './screens/RecordsScreen'
import { ReplayScreen } from './screens/ReplayScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { SplashScreen } from './screens/SplashScreen'
import { TutorialScreen } from './screens/TutorialScreen'
import { AppStoreProvider, useAppStore } from './store/AppStore'
import type { Difficulty, GameMode, GameRecord, Player, Position } from './types'
import { hapticImpact, hapticResult, playButtonSound, playStoneSound, playVictorySound, setAmbientMusic } from './utils/feedback'
import { shareRecord } from './utils/shareRecord'

type Route = 'main' | 'game' | 'settings' | 'tutorial' | 'replay'

interface GameConfig {
  mode: GameMode
  difficulty?: Difficulty
  playerColor: Player
  opponentName: string
  opponentAvatar: string
  tutorialMessage?: string
}

const AI_LEVELS: Array<{ id: Difficulty; name: string; subtitle: string; icon: typeof Bot; strength: number }> = [
  { id: 'easy', name: '简单', subtitle: '轻松熟悉棋盘', icon: Circle, strength: 1 },
  { id: 'normal', name: '普通', subtitle: '均衡攻守判断', icon: Shield, strength: 2 },
  { id: 'hard', name: '困难', subtitle: '主动制造威胁', icon: Swords, strength: 3 },
  { id: 'master', name: '大师', subtitle: '深度计算棋路', icon: Crown, strength: 4 },
]

const DAILY_MOVES = [
  { row: 7, col: 7, player: 'black' as const }, { row: 7, col: 8, player: 'white' as const },
  { row: 8, col: 7, player: 'black' as const }, { row: 8, col: 8, player: 'white' as const },
  { row: 9, col: 7, player: 'black' as const }, { row: 9, col: 8, player: 'white' as const },
  { row: 5, col: 5, player: 'black' as const }, { row: 10, col: 8, player: 'white' as const },
  { row: 6, col: 5, player: 'black' as const },
]

const TUTORIAL_MOVES = [
  { row: 7, col: 6, player: 'black' as const }, { row: 6, col: 6, player: 'white' as const },
  { row: 7, col: 7, player: 'black' as const }, { row: 6, col: 7, player: 'white' as const },
  { row: 7, col: 8, player: 'black' as const }, { row: 10, col: 10, player: 'white' as const },
]

const opponentPool = [
  { name: '松间照', avatar: '松' },
  { name: '白石有声', avatar: '石' },
  { name: '清风入局', avatar: '清' },
]

function AppContent() {
  const {
    profile,
    settings,
    records,
    rankings,
    dailyChallenge,
    updateSettings,
    resetSettings,
    updateProfile,
    saveGame,
    completeDailyChallenge,
  } = useAppStore()

  const [splashVisible, setSplashVisible] = useState(true)
  const [route, setRoute] = useState<Route>('main')
  const [activeTab, setActiveTab] = useState<MainTab>('home')
  const [settingsReturn, setSettingsReturn] = useState<'main' | 'game'>('main')
  const [game, setGame] = useState<GameState>(() => createGameState())
  const [gameConfig, setGameConfig] = useState<GameConfig>({ mode: 'ai', difficulty: 'normal', playerColor: 'black', opponentName: '玄枢', opponentAvatar: '玄' })
  const [aiThinking, setAiThinking] = useState(false)
  const [hint, setHint] = useState<Position | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [selectedRecord, setSelectedRecord] = useState<GameRecord | null>(null)
  const [finishedRecord, setFinishedRecord] = useState<GameRecord | null>(null)
  const [aiModal, setAiModal] = useState(false)
  const [exitModal, setExitModal] = useState(false)
  const [profileModal, setProfileModal] = useState(false)
  const [onlineModal, setOnlineModal] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [selectedColor, setSelectedColor] = useState<Player>('black')
  const [draftNickname, setDraftNickname] = useState(profile.nickname)
  const [draftAvatar, setDraftAvatar] = useState(profile.avatar)
  const [toast, setToast] = useState<string | null>(null)

  const startedAtRef = useRef(Date.now())
  const initialGameRef = useRef<GameState>(createGameState())
  const gameRef = useRef<GameState>(game)
  const gameIdRef = useRef('')
  const savedRef = useRef(false)
  const moveLockRef = useRef(false)
  const hintTimerRef = useRef<number | null>(null)
  gameRef.current = game

  useEffect(() => {
    const timer = window.setTimeout(() => setSplashVisible(false), 1700)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.appearance = settings.darkMode ? 'dark' : 'light'
    document.documentElement.dataset.board = settings.boardTheme
    document.documentElement.dataset.motion = settings.animationSpeed
  }, [settings])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    void StatusBar.setBackgroundColor({ color: settings.darkMode ? '#0d1110' : '#edf1ed' })
    void StatusBar.setStyle({ style: settings.darkMode ? Style.Light : Style.Dark })
  }, [settings.darkMode])

  useEffect(() => {
    const returningToGame = route === 'game' || (route === 'settings' && settingsReturn === 'game')
    setAmbientMusic(settings.music && returningToGame)
  }, [route, settings.music, settingsReturn])

  useEffect(() => {
    if (route !== 'game' || game.status !== 'playing') return
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [game.status, route])

  const startGame = useCallback((config: GameConfig, initialState = createGameState()) => {
    playButtonSound(settings.sound)
    void hapticImpact(settings.haptics)
    initialGameRef.current = initialState
    gameIdRef.current = crypto.randomUUID?.() ?? `game-${Date.now()}`
    savedRef.current = false
    startedAtRef.current = Date.now()
    setElapsedSeconds(0)
    setFinishedRecord(null)
    setHint(null)
    setAiThinking(false)
    setGameConfig(config)
    setGame(initialState)
    setAiModal(false)
    setOnlineModal(false)
    setRoute('game')
    setAmbientMusic(settings.music)
  }, [settings.haptics, settings.music, settings.sound])

  useEffect(() => {
    const needsComputerMove = route === 'game'
      && game.status === 'playing'
      && gameConfig.mode !== 'local'
      && game.currentPlayer !== gameConfig.playerColor
    if (!needsComputerMove) {
      setAiThinking(false)
      return
    }

    let cancelled = false
    setAiThinking(true)
    const delay = settings.animationSpeed === 'swift' ? 180 : settings.animationSpeed === 'calm' ? 620 : 390
    const timer = window.setTimeout(() => {
      if (cancelled) return
      const current = gameRef.current
      if (current.status !== 'playing' || current.currentPlayer === gameConfig.playerColor) {
        setAiThinking(false)
        return
      }
      const decision = chooseAIMove(current.board, current.currentPlayer, gameConfig.difficulty ?? 'normal')
      if (!decision) {
        setAiThinking(false)
        return
      }
      const next = playMove(current, decision.position)
      playStoneSound(settings.sound, current.currentPlayer)
      void hapticImpact(settings.haptics)
      setGame(next)
      setAiThinking(false)
    }, delay)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [game.board, game.currentPlayer, game.status, gameConfig, route, settings.animationSpeed, settings.haptics, settings.sound])

  const buildRecord = useCallback((state: GameState): GameRecord => {
    const review = analyzeGame(state)
    let balance = 0
    const qualityDelta: Record<MoveAnalysis['quality'], number> = { best: 4, good: 2, inaccuracy: -3, mistake: -8, blunder: -15 }
    const moves = state.moves.map((move, index) => {
      const delta = qualityDelta[review.moves[index]?.quality ?? 'good']
      balance += move.player === 'black' ? delta : -delta
      return {
        row: move.row,
        col: move.col,
        player: move.player,
        moveNumber: move.number,
        timestamp: startedAtRef.current + index * 1000,
        evaluation: Math.max(-42, Math.min(42, balance)),
      }
    })
    return {
      id: gameIdRef.current,
      mode: gameConfig.mode,
      difficulty: gameConfig.difficulty,
      date: new Date().toISOString(),
      duration: Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000)),
      moves,
      result: state.status === 'draw' ? 'draw' : state.winner,
      opponent: gameConfig.opponentName,
      playerColor: gameConfig.playerColor,
      score: review.summary.accuracy,
    }
  }, [gameConfig])

  useEffect(() => {
    if (game.status === 'playing' || savedRef.current || route !== 'game') return
    savedRef.current = true
    const record = buildRecord(game)
    setFinishedRecord(record)
    if (gameConfig.mode !== 'tutorial') saveGame(record)
    if (gameConfig.mode === 'daily') completeDailyChallenge(record.score ?? 0, record.id)
    const won = game.status === 'won' && game.winner === gameConfig.playerColor
    playVictorySound(settings.sound && won)
    void hapticResult(settings.haptics, won)
  }, [buildRecord, completeDailyChallenge, game, gameConfig.mode, gameConfig.playerColor, route, saveGame, settings.haptics, settings.sound])

  useEffect(() => {
    if (!onlineModal) return
    const opponent = opponentPool[Math.floor(Math.random() * opponentPool.length)]
    const timer = window.setTimeout(() => startGame({
      mode: 'online',
      difficulty: 'hard',
      playerColor: 'black',
      opponentName: opponent.name,
      opponentAvatar: opponent.avatar,
    }), 1900)
    return () => window.clearTimeout(timer)
  }, [onlineModal, startGame])

  const handlePlace = (position: Position) => {
    if (aiThinking || moveLockRef.current || game.status !== 'playing') return
    if (gameConfig.mode !== 'local' && game.currentPlayer !== gameConfig.playerColor) return
    const result = tryPlayMove(game, position)
    if (!result.ok) return
    moveLockRef.current = true
    playStoneSound(settings.sound, game.currentPlayer)
    void hapticImpact(settings.haptics)
    setHint(null)
    setGame(result.state)
    window.setTimeout(() => { moveLockRef.current = false }, 80)
  }

  const handleUndo = () => {
    if (!game.moves.length || aiThinking) return
    const count = gameConfig.mode === 'local' ? 1 : Math.min(2, game.moves.length)
    setGame((current) => undoMoves(current, count))
    setHint(null)
    playButtonSound(settings.sound)
    void hapticImpact(settings.haptics)
  }

  const handleHint = () => {
    const moveHint = getBestMoveHint(game, gameConfig.difficulty ?? 'hard')
    if (!moveHint) return
    setHint(moveHint.position)
    playButtonSound(settings.sound)
    if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current)
    hintTimerRef.current = window.setTimeout(() => setHint(null), 2600)
  }

  const restartCurrent = () => {
    gameIdRef.current = crypto.randomUUID?.() ?? `game-${Date.now()}`
    savedRef.current = false
    startedAtRef.current = Date.now()
    setElapsedSeconds(0)
    setFinishedRecord(null)
    setHint(null)
    setGame(initialGameRef.current)
    playButtonSound(settings.sound)
  }

  const openSettings = (from: 'main' | 'game') => {
    setSettingsReturn(from)
    setRoute('settings')
  }

  const startDaily = () => startGame({
    mode: 'daily', difficulty: 'hard', playerColor: 'white', opponentName: '每日残局', opponentAvatar: '局',
    tutorialMessage: '白方先行，找到立即制胜的位置',
  }, replayMoves(DAILY_MOVES))

  const startLesson = (lesson: number) => {
    const tacticalLesson = lesson === 1
    startGame({
      mode: 'tutorial', difficulty: 'easy', playerColor: 'black', opponentName: '执教棋手', opponentAvatar: '师',
      tutorialMessage: tacticalLesson ? '延伸横向棋形，构成两端皆可落子的活四' : '落在棋盘中心，建立第一手空间',
    }, tacticalLesson ? replayMoves(TUTORIAL_MOVES) : createGameState())
  }

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2200)
  }

  const handleShare = async (record: GameRecord) => {
    try {
      await shareRecord(record)
      showToast('棋谱图片已生成')
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') showToast('暂时无法分享棋谱')
    }
  }

  const insights = useMemo(() => {
    if (!selectedRecord) return []
    const review = analyzeGame(selectedRecord.moves.map((move) => ({ ...move, number: move.moveNumber })))
    const copy: Record<MoveAnalysis['explanationKey'], [string, string]> = {
      opening_choice: ['布局稳健', '落点兼顾中心控制，为后续连接保留空间。'],
      best_move: ['最佳落点', '这一手在当前局面下兼顾攻防，是评分最高的选择。'],
      strong_alternative: ['好棋', '方向正确，同时保留了两条可继续发展的路线。'],
      small_loss: ['可再斟酌', '局部形状略显松散，更紧凑的落点能保持先手。'],
      large_loss: ['局势转折', '这一手让出了主动权，应优先处理对方的连续威胁。'],
      converted_win: ['胜着', '准确完成连珠，对手已无法阻止五连。'],
      found_only_block: ['唯一防点', '及时封住对方的直接胜点，延续了棋局。'],
      missed_immediate_win: ['错失胜机', '此处存在立即取胜的位置，可以直接完成五连。'],
      missed_immediate_block: ['防守疏漏', '未封住对方的直接胜点，局面由此失控。'],
    }
    return review.keyMoments.map((moment) => {
      const [title, detail] = copy[moment.explanationKey]
      return {
        moveNumber: moment.move.number,
        tone: moment.quality === 'best' ? 'best' as const : moment.quality === 'mistake' || moment.quality === 'blunder' ? 'warning' as const : 'good' as const,
        title,
        detail,
        position: moment.bestMove ?? moment.move,
      }
    })
  }, [selectedRecord])

  if (splashVisible) return <SplashScreen />

  let content: React.ReactNode
  if (route === 'settings') {
    content = <SettingsScreen settings={settings} onChange={updateSettings} onBack={() => setRoute(settingsReturn === 'game' ? 'game' : 'main')} onReset={() => { resetSettings(); showToast('已恢复默认设置') }} />
  } else if (route === 'tutorial') {
    content = <TutorialScreen onBack={() => setRoute('main')} onStartLesson={startLesson} />
  } else if (route === 'replay' && selectedRecord) {
    content = <ReplayScreen record={selectedRecord} insights={insights} onBack={() => { setRoute('main'); setActiveTab('records') }} onShare={() => void handleShare(selectedRecord)} />
  } else if (route === 'game') {
    content = (
      <GameScreen
        game={game}
        mode={gameConfig.mode}
        difficulty={gameConfig.difficulty}
        profile={profile}
        playerColor={gameConfig.playerColor}
        opponentName={gameConfig.opponentName}
        opponentAvatar={gameConfig.opponentAvatar}
        aiThinking={aiThinking}
        hint={hint}
        elapsedSeconds={elapsedSeconds}
        pieceStyle={settings.pieceStyle}
        tutorialMessage={gameConfig.tutorialMessage}
        onPlace={handlePlace}
        onUndo={handleUndo}
        onHint={handleHint}
        onRestart={restartCurrent}
        onExit={() => game.status === 'playing' && game.moves.length ? setExitModal(true) : setRoute('main')}
        onSettings={() => openSettings('game')}
        onReview={() => {
          const record = finishedRecord ?? buildRecord(game)
          setSelectedRecord(record)
          setRoute('replay')
        }}
      />
    )
  } else if (activeTab === 'records') {
    content = <RecordsScreen records={records} onOpenRecord={(record) => { setSelectedRecord(record); setRoute('replay') }} />
  } else if (activeTab === 'ranking') {
    content = <RankingScreen rankings={rankings} />
  } else if (activeTab === 'profile') {
    content = <ProfileScreen profile={profile} onSettings={() => openSettings('main')} onEditProfile={() => { setDraftNickname(profile.nickname); setDraftAvatar(profile.avatar); setProfileModal(true) }} />
  } else {
    content = (
      <HomeScreen
        profile={profile}
        onOpenProfile={() => setActiveTab('profile')}
        onStartAI={() => setAiModal(true)}
        onStartLocal={() => startGame({ mode: 'local', playerColor: 'black', opponentName: '白方棋手', opponentAvatar: '白' })}
        onStartDaily={startDaily}
        onStartTutorial={() => setRoute('tutorial')}
        onOnline={() => setOnlineModal(true)}
        dailyCompleted={dailyChallenge.completed}
      />
    )
  }

  return (
    <AppShell activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setRoute('main') }} hideNavigation={route !== 'main'} screenKey={`${route}-${route === 'main' ? activeTab : ''}`}>
      {content}

      <Modal open={aiModal} onClose={() => setAiModal(false)} title="选择对手棋力" subtitle="每一档都具备基础攻防与即时胜负判断">
        <div className="difficulty-grid">
          {AI_LEVELS.map(({ id, name, subtitle, icon: Icon, strength }) => (
            <button type="button" key={id} className={difficulty === id ? 'is-selected' : ''} onClick={() => setDifficulty(id)}>
              <span><Icon size={21} /></span>
              <div><strong>{name}</strong><small>{subtitle}</small><i>{Array.from({ length: 4 }, (_, index) => <b key={index} className={index < strength ? 'is-on' : ''} />)}</i></div>
              {difficulty === id && <Check size={17} />}
            </button>
          ))}
        </div>
        <div className="color-choice">
          <span>执子</span>
          <SegmentedControl<Player> label="选择棋子颜色" value={selectedColor} onChange={setSelectedColor} options={[{ value: 'black', label: '执黑先行' }, { value: 'white', label: '执白后行' }]} />
        </div>
        <button type="button" className="primary-button primary-button--wide" onClick={() => startGame({ mode: 'ai', difficulty, playerColor: selectedColor, opponentName: `玄枢 · ${AI_LEVELS.find((item) => item.id === difficulty)?.name}`, opponentAvatar: '玄' })}>
          <Zap size={19} /><strong>进入棋局</strong>
        </button>
      </Modal>

      <Modal open={onlineModal} onClose={() => setOnlineModal(false)} title="赛季匹配" subtitle="正在寻找棋力相近的对手" compact>
        <div className="matchmaking-state">
          <div className="matchmaking-radar"><i /><i /><span><LoaderCircle size={28} /></span></div>
          <strong>匹配中</strong><p>夏至赛季 · 标准十五路</p>
        </div>
        <button type="button" className="secondary-button secondary-button--wide" onClick={() => setOnlineModal(false)}>取消匹配</button>
      </Modal>

      <Modal open={exitModal} onClose={() => setExitModal(false)} title="退出当前棋局？" subtitle="未结束的对局不会计入战绩" compact>
        <div className="confirm-actions">
          <button type="button" className="secondary-button" onClick={() => setExitModal(false)}>继续对局</button>
          <button type="button" className="danger-button" onClick={() => { setExitModal(false); setRoute('main'); setAmbientMusic(false) }}>退出棋局</button>
        </div>
      </Modal>

      <Modal open={profileModal} onClose={() => setProfileModal(false)} title="编辑个人资料" subtitle="选择你的棋坛名号与头像" compact>
        <label className="profile-input"><span>昵称</span><input value={draftNickname} maxLength={12} onChange={(event) => setDraftNickname(event.target.value)} /></label>
        <div className="avatar-picker" role="radiogroup" aria-label="选择头像">
          {['弈', '安', '云', '灯', '松', '观', '石', '雨'].map((avatar) => (
            <button type="button" key={avatar} className={draftAvatar === avatar ? 'is-selected' : ''} onClick={() => setDraftAvatar(avatar)} role="radio" aria-checked={draftAvatar === avatar} aria-label={`选择${avatar}头像`}>
              <Avatar value={avatar} size="md" />
            </button>
          ))}
        </div>
        <button type="button" className="primary-button primary-button--wide" disabled={!draftNickname.trim()} onClick={() => { updateProfile({ nickname: draftNickname.trim(), avatar: draftAvatar }); setProfileModal(false); showToast('个人资料已更新') }}><Sparkles size={18} /><strong>保存资料</strong></button>
      </Modal>

      {toast && <div className="toast-message"><Check size={16} />{toast}</div>}
    </AppShell>
  )
}

export function App() {
  return <AppStoreProvider><AppContent /></AppStoreProvider>
}
