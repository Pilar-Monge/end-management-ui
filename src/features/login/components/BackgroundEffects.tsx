/* eslint-disable react-hooks/purity */
import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { GHOST_CHARACTERS } from '../../../shared/constants/app'

function GhostCharacter({
  x,
  size,
  delay,
  opacity,
}: {
  x: string
  size: number
  delay: number
  opacity: number
}) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: x,
        bottom: 0,
        opacity,
        pointerEvents: 'none',
        filter: 'blur(0.5px)',
      }}
      animate={{ y: [0, -18, 0] }}
      transition={{
        duration: 4 + delay,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    >
      <svg width={size} height={size * 1.9} viewBox="0 0 90 170" fill="none">
        <ellipse cx="45" cy="22" rx="17" ry="19" fill="#1c3a10" stroke="#3a6020" strokeWidth="1" />
        <path
          d="M18 40 Q45 34 72 40 L70 95 Q45 100 20 95 Z"
          fill="#1c3a10"
          stroke="#3a6020"
          strokeWidth="1"
        />
        <rect
          x="10"
          y="36"
          width="14"
          height="36"
          rx="3"
          fill="#1c3a10"
          stroke="#3a6020"
          strokeWidth="1"
        />
        <rect
          x="66"
          y="36"
          width="14"
          height="36"
          rx="3"
          fill="#1c3a10"
          stroke="#3a6020"
          strokeWidth="1"
        />
        <rect
          x="20"
          y="94"
          width="22"
          height="58"
          rx="4"
          fill="#162c0c"
          stroke="#2a5018"
          strokeWidth="1"
        />
        <rect
          x="48"
          y="94"
          width="22"
          height="58"
          rx="4"
          fill="#162c0c"
          stroke="#2a5018"
          strokeWidth="1"
        />
        <rect
          x="18"
          y="144"
          width="26"
          height="16"
          rx="3"
          fill="#101e08"
          stroke="#1e3a10"
          strokeWidth="1"
        />
        <rect
          x="46"
          y="144"
          width="26"
          height="16"
          rx="3"
          fill="#101e08"
          stroke="#1e3a10"
          strokeWidth="1"
        />
        <ellipse cx="38" cy="21" rx="3" ry="2" fill="#3a7020" opacity="0.5" />
        <ellipse cx="52" cy="21" rx="3" ry="2" fill="#3a7020" opacity="0.5" />
      </svg>
    </motion.div>
  )
}

export function FloatingParticles() {
  const particles = useMemo(
    () => Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      x: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 6,
      duration: 4 + Math.random() * 5,
      color: `rgba(${60 + Math.random() * 40}, ${130 + Math.random() * 60}, ${20 + Math.random() * 20}, ${0.2 + Math.random() * 0.4})`,
    })),
    [],
  )

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.x,
            bottom: 0,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
          }}
          animate={{ y: [0, -320], opacity: [0, 0.8, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

export function Scanlines() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  )
}

export function HudCorners() {
  const corners = [
    { top: 16, left: 16, rotate: 0 },
    { top: 16, right: 16, rotate: 90 },
    { bottom: 16, right: 16, rotate: 180 },
    { bottom: 16, left: 16, rotate: 270 },
  ] as const

  return (
    <>
      {corners.map((c, i) => (
        <motion.svg
          key={i}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ delay: 0.4 + i * 0.08 }}
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          style={{ position: 'absolute', ...c, transform: `rotate(${c.rotate}deg)` }}
        >
          <path d="M0 12 L0 0 L12 0" stroke="#4a8a28" strokeWidth="1.5" fill="none" />
        </motion.svg>
      ))}
    </>
  )
}

export function GhostCharactersLayer() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {GHOST_CHARACTERS.map((character, index) => (
        <GhostCharacter key={index} {...character} />
      ))}
    </div>
  )
}
