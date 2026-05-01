import { useEffect, useRef, useState } from 'react'
import '../mainHomepage.css'

type MenuItem = 'intro' | 'menu' | 'login'

function GitHubIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.54 2.87 8.39 6.84 9.75.5.09.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 7.01c.85 0 1.7.12 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.49A10.14 10.14 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
    </svg>
  )
}

const teamMembers = [
  { name: 'Gabriel Bermudez Miranda', git: 'https://github.com/GabrielBermudezMiranda' },
  { name: 'Pilar Monge Ureña', git: 'https://github.com/Pilar-Monge' },
  { name: 'Edicson Picado Quesada', git: 'https://github.com/Edicson-PQ' },
  { name: 'Emily Castillo Monge', git: 'https://github.com/EmilyCastill0' },
  { name: 'Jeison Saldaña Rios', git: 'https://github.com/JeisonSaldanaRios' },
]

const menuLabels: Record<MenuItem, string> = {
  intro: 'INTRO',
  menu: 'MAIN MENU',
  login: 'LOGIN',
}

export function MainHomePage() {
  const [active, setActive] = useState<MenuItem>('login')
  const [showUI, setShowUI] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showCredits, setShowCredits] = useState(false)
  const [isDecoding, setIsDecoding] = useState(true)
  const [decodedTitle, setDecodedTitle] = useState('END MANAGEMENT')
  const [subtitleText, setSubtitleText] = useState('')
  const subtitleStarted = useRef(false)

  useEffect(() => {
    const target = 'END MANAGEMENT'
    const decodeChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let iteration = 0

    const interval = window.setInterval(() => {
      setDecodedTitle(
        target
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' '
            if (index < iteration) return target[index]
            return decodeChars[Math.floor(Math.random() * decodeChars.length)]
          })
          .join(''),
      )

      iteration += 0.3
      if (iteration >= target.length + 1) {
        window.clearInterval(interval)
        setDecodedTitle(target)
        setIsDecoding(false)
      }
    }, 90)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const subtitleFull = 'SURVIVAL SYSTEM — PROJECT X'
    const startDelay = window.setTimeout(() => {
      if (subtitleStarted.current) return
      subtitleStarted.current = true
      let index = 0
      const interval = window.setInterval(() => {
        index++
        setSubtitleText(subtitleFull.slice(0, index))
        if (index >= subtitleFull.length) window.clearInterval(interval)
      }, 55)
    }, 2400)

    return () => window.clearTimeout(startDelay)
  }, [])

  useEffect(() => {
    const uiTimer = window.setTimeout(() => setShowUI(true), 800)
    const menuTimer = window.setTimeout(() => setShowMenu(true), 3400)

    return () => {
      window.clearTimeout(uiTimer)
      window.clearTimeout(menuTimer)
    }
  }, [])

  const [titleTop, ...titleRest] = decodedTitle.split(' ')
  const titleBottom = titleRest.join(' ')

  return (
    <main className="main-homepage">
      <div className="main-homepage__background" />
      <div className="main-homepage__overlay main-homepage__overlay--vertical" />
      <div className="main-homepage__overlay main-homepage__overlay--horizontal" />
      <div className="main-homepage__vignette" />

      <div className="background-depth-light" />
      <div className="background-depth-fog" />
      <div className="background-depth-shadow" />
      <div className="main-homepage__grain" />
      <div className="main-homepage__scanlines scanlines" />

      <div className={`main-homepage__icons ${showUI ? 'is-visible' : ''}`}>
        <button className="icon-btn icon-audio" title="Audio" type="button">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="12" x2="4" y2="16" />
            <line x1="8" y1="8" x2="8" y2="20" />
            <line x1="12" y1="4" x2="12" y2="16" />
            <line x1="16" y1="10" x2="16" y2="18" />
            <line x1="20" y1="7" x2="20" y2="14" />
          </svg>
        </button>
        <button className="icon-btn icon-settings" title="Settings" type="button">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </button>
        <button className="icon-btn icon-exit" title="Exit" type="button">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>

      <section className="main-homepage__title" aria-label="End Management">
        <h1
          className={`title-distressed title-glitch-hover ${isDecoding ? 'title-decoding-flicker' : ''}`}
          data-text={titleTop || 'END'}
        >
          <span className="title-text-white">{titleTop || 'END'}</span>
        </h1>
        <h1
          className={`title-distressed title-glitch-hover ${isDecoding ? 'title-decoding-flicker' : ''}`}
          data-text={titleBottom || 'MANAGEMENT'}
        >
          <span className="title-text-gold">{titleBottom || 'MANAGEMENT'}</span>
        </h1>
        <div className="main-homepage__subtitle">
          <div className="subtitle-line" />
          <p>
            <span className="typewriter-text">{subtitleText}</span>
            <span className="typewriter-cursor">|</span>
          </p>
        </div>
      </section>

      <nav className="main-homepage__menu" aria-label="Main menu">
        <ul>
          {(['intro', 'menu', 'login'] as const).map((item, index) => (
            <li
              key={item}
              style={{
                opacity: showMenu ? 1 : 0,
                transform: showMenu ? 'translateX(0)' : 'translateX(40px)',
                transition: `all 0.6s cubic-bezier(.22,1,.36,1) ${index * 0.15}s`,
              }}
            >
              <button
                type="button"
                onClick={() => setActive(item)}
                className={`menu-item menu-brush ${active === item ? 'is-active menu-brush-active-blue' : ''}`}
              >
                <span>
                  {menuLabels[item]}
                  {active === item && <span className="arrow-pulse">▶</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className={`main-homepage__studio ${showMenu ? 'is-visible' : ''}`}>
        <button
          type="button"
          onClick={() => setShowCredits((value) => !value)}
          className="studio-badge"
          aria-expanded={showCredits}
          aria-controls="studio-credits"
        >
          <span className="studio-badge-title">PentaDev Studio</span>
          <span className="studio-badge-subtitle">creditos del sistema</span>
        </button>
      </div>

      {showCredits && (
        <div className="main-homepage__credits-modal">
          <button
            type="button"
            className="main-homepage__credits-backdrop"
            aria-label="Cerrar creditos"
            onClick={() => setShowCredits(false)}
          />
          <section id="studio-credits" className="credits-panel" aria-label="Creditos de PentaDev Studio">
            <div className="credits-header">
              <div>
                <p className="credits-kicker">compañia creadora</p>
                <h2>PentaDev Studio</h2>
              </div>
              <button type="button" className="credits-close" onClick={() => setShowCredits(false)} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className="credits-list">
              {teamMembers.map((member) => (
                <a key={member.git} className="credits-member" href={member.git} target="_blank" rel="noreferrer">
                  <span>{member.name}</span>
                  <span className="credits-github">
                    <GitHubIcon className="credits-github__icon" />
                    GitHub
                  </span>
                </a>
              ))}
            </div>
          </section>
        </div>
      )}

      <svg
        className="main-homepage__foreground"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g fill="black">
          <path d="M0,0 L0,250 Q200,180 350,260 Q500,340 650,200 Q700,180 720,0 Z" />
          <path d="M1920,0 L1920,300 Q1700,250 1550,330 Q1400,400 1300,250 Q1280,150 1300,0 Z" />
        </g>
      </svg>

      <svg className="main-homepage__filter" aria-hidden="true">
        <defs>
          <filter id="grunge">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" seed="2" result="noise" />
            <feColorMatrix in="noise" type="saturate" values="0" result="desaturated" />
            <feComponentTransfer in="desaturated" result="threshold">
              <feFuncA type="discrete" tableValues="0 0 1 1 1 1" />
            </feComponentTransfer>
            <feComposite in="SourceGraphic" in2="threshold" operator="in" />
          </filter>
        </defs>
      </svg>
    </main>
  )
}
