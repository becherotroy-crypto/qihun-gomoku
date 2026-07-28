import { motion } from 'framer-motion'

export function SplashScreen() {
  return (
    <section className="splash-screen">
      <div className="splash-mark" aria-hidden="true">
        <motion.span
          className="splash-stone splash-stone--white"
          initial={{ y: -92, opacity: 0, scale: 1.35 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 18 }}
        />
        <motion.span
          className="splash-stone splash-stone--black"
          initial={{ y: -112, opacity: 0, scale: 1.5 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.48, type: 'spring', stiffness: 280, damping: 17 }}
        />
      </div>
      <motion.div
        className="splash-wordmark"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75, duration: 0.5 }}
      >
        <span>棋魂</span>
        <h1>五子棋</h1>
        <p>落子无悔 · 方寸见心</p>
      </motion.div>
      <motion.div
        className="splash-progress"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.8, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      />
    </section>
  )
}
