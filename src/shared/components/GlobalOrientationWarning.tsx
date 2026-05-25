import { useOrientation } from '../hooks/useOrientation'
import { motion } from 'framer-motion'
import '../styles/GlobalOrientationLock.css'

export function GlobalOrientationWarning() {
  const orientation = useOrientation()

  const isMobileDevice = /iPhone|iPad|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  )

  if (isMobileDevice && orientation === 'portrait') {
    return (
      <div className="global-orientation-lock">
        <div className="bg-effects">
          <div className="bg-depth-light"></div>
          <div className="bg-depth-fog"></div>
          <div className="bg-depth-shadow"></div>
        </div>

        <motion.div
          className="lock-content"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <motion.div
            className="lock-icon"
            animate={{ rotateZ: 360 }}
            transition={{
              duration: 4,
              ease: 'easeInOut',
              repeat: Infinity,
            }}
          >
            <svg
              width="120"
              height="120"
              viewBox="0 0 120 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="phone-icon"
            >
              <rect
                x="45"
                y="20"
                width="30"
                height="50"
                rx="4"
                stroke="#69BFB7"
                strokeWidth="2.5"
                fill="none"
              />
              <circle cx="60" cy="80" r="2" fill="#69BFB7" />

              <path
                d="M 95 15 Q 110 15 110 30"
                stroke="#69BFB7"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M 105 25 L 110 30 L 100 32" fill="#69BFB7" />

              <path
                d="M 25 105 Q 10 105 10 90"
                stroke="#69BFB7"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M 15 95 L 10 90 L 20 88" fill="#69BFB7" />
            </svg>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Gira tu dispositivo
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            Esta aplicación SOLO funciona en modo horizontal
          </motion.p>
        </motion.div>
      </div>
    )
  }

  return null
}
