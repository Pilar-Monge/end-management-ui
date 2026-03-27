import { motion } from 'framer-motion';
import { GHOST_CHARACTERS } from '../../../shared/constants/app';

function GhostCharacter({
  x,
  size,
  delay,
  opacity,
  landingMode = false,
}: {
  x: string;
  size: number;
  delay: number;
  opacity: number;
  landingMode?: boolean;
}) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: x,
        bottom: landingMode ? '35%' : 0,
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
        <path d="M18 40 Q45 34 72 40 L70 95 Q45 100 20 95 Z" fill="#1c3a10" stroke="#3a6020" strokeWidth="1" />
        <rect x="10" y="36" width="14" height="36" rx="3" fill="#1c3a10" stroke="#3a6020" strokeWidth="1" />
        <rect x="66" y="36" width="14" height="36" rx="3" fill="#1c3a10" stroke="#3a6020" strokeWidth="1" />
        <rect x="20" y="94" width="22" height="58" rx="4" fill="#162c0c" stroke="#2a5018" strokeWidth="1" />
        <rect x="48" y="94" width="22" height="58" rx="4" fill="#162c0c" stroke="#2a5018" strokeWidth="1" />
        <rect x="18" y="144" width="26" height="16" rx="3" fill="#101e08" stroke="#1e3a10" strokeWidth="1" />
        <rect x="46" y="144" width="26" height="16" rx="3" fill="#101e08" stroke="#1e3a10" strokeWidth="1" />
        <ellipse cx="38" cy="21" rx="3" ry="2" fill="#3a7020" opacity="0.5" />
        <ellipse cx="52" cy="21" rx="3" ry="2" fill="#3a7020" opacity="0.5" />
      </svg>
    </motion.div>
  );
}

interface LandingGhostsProps {
  fadingOut?: boolean;
}

export function LandingGhosts({ fadingOut = false }: LandingGhostsProps) {
  return (
    <motion.div
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
      animate={{ opacity: fadingOut ? 0.06 : 1 }}
      transition={{ duration: 0.6 }}
    >
      {GHOST_CHARACTERS.map((character, index) => (
        <GhostCharacter key={index} {...character} landingMode={true} />
      ))}
    </motion.div>
  );
}
