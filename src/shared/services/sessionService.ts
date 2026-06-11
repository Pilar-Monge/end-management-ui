import { throttle } from '../utils/throttle'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const SESSION_TIMEOUT_MS = 20 * 60 * 1000
const HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000
export const SESSION_TOKEN_CHANGED_EVENT = 'session-token-changed'

export class SessionService {
  private lastActivityAt = Date.now()
  private lastHeartbeatAt = 0
  private inactivityTimer: number | null = null
  private heartbeatInterval: number | null = null
  private listenersAttached = false
  private activityHandler = () => this.markActivity()
  private throttledActivityHandler = throttle(() => this.markActivity(), 100)
  private onSessionExpired: (() => void) | null = null
  private onTokenRefreshed: (() => void) | null = null

  private clearSession(): void {
    localStorage.removeItem('token')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    localStorage.removeItem('admin_settings_v2')
    window.dispatchEvent(new Event(SESSION_TOKEN_CHANGED_EVENT))
  }

  private async checkSession(): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/auth/check-session`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          this.expireSession()
        }
        return false
      }

      return true
    } catch (error) {
      console.error('Error checking session:', error)
      return false
    }
  }

  private resetInactivityTimer(): void {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer)

    this.inactivityTimer = setTimeout(() => {
      console.warn('Session expired due to inactivity')
      this.expireSession()
    }, SESSION_TIMEOUT_MS)
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)

    this.heartbeatInterval = setInterval(async () => {
      const now = Date.now()
      const inactiveMs = now - this.lastActivityAt

      if (inactiveMs >= SESSION_TIMEOUT_MS) {
        console.warn('Session expired due to prolonged inactivity')
        this.expireSession()
        return
      }

      const hadRecentActivity = this.lastActivityAt > this.lastHeartbeatAt
      if (!hadRecentActivity) {
        return
      }

      await this.checkSession()
      this.lastHeartbeatAt = now
    }, HEARTBEAT_INTERVAL_MS)
  }

  public markActivity(): void {
    this.lastActivityAt = Date.now()
    this.resetInactivityTimer()
  }

  public expireSession(): void {
    const onSessionExpired = this.onSessionExpired
    this.stop()
    this.clearSession()
    onSessionExpired?.()
  }

  public start(onSessionExpired: () => void, onTokenRefreshed: () => void): void {
    this.onSessionExpired = onSessionExpired
    this.onTokenRefreshed = onTokenRefreshed

    if (!this.isTokenValid()) {
      return
    }

    if (!this.listenersAttached) {
      const events = ['mousemove', 'mousedown', 'click', 'keydown']
      const throttledEvents = ['touchstart', 'scroll']
      events.forEach((event) => {
        document.addEventListener(event, this.activityHandler, { passive: true })
      })
      throttledEvents.forEach((event) => {
        document.addEventListener(event, this.throttledActivityHandler, { passive: true })
      })
      this.listenersAttached = true
    }

    this.markActivity()
    this.startHeartbeat()
  }

  public stop(): void {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer)
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)

    if (this.listenersAttached) {
      const events = ['mousemove', 'mousedown', 'click', 'keydown']
      const throttledEvents = ['touchstart', 'scroll']
      events.forEach((event) => {
        document.removeEventListener(event, this.activityHandler)
      })
      throttledEvents.forEach((event) => {
        document.removeEventListener(event, this.throttledActivityHandler)
      })
      this.throttledActivityHandler.cancel()
      this.listenersAttached = false
    }

    this.onSessionExpired = null
    this.onTokenRefreshed = null
  }

  public isTokenValid(): boolean {
    return !!localStorage.getItem('user')
  }
}

export const sessionService = new SessionService()
