const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const SESSION_TIMEOUT_MS = 20 * 60 * 1000
const HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000

export class SessionService {
  private lastActivityAt = Date.now()
  private lastHeartbeatAt = 0
  private inactivityTimer: number | null = null
  private heartbeatInterval: number | null = null
  private listenersAttached = false
  private activityHandler = () => this.markActivity()
  private onSessionExpired: (() => void) | null = null
  private onTokenRefreshed: (() => void) | null = null

  private getToken(): string | null {
    return localStorage.getItem('token')
  }

  private saveToken(token: string): void {
    localStorage.setItem('token', token)
  }

  private clearSession(): void {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  private async checkSession(): Promise<string | null> {
    try {
      const token = this.getToken()
      if (!token) return null

      const response = await fetch(`${BASE_URL}/auth/check-session`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          this.expireSession()
        }
        return null
      }

      const authHeader = response.headers.get('Authorization')
      if (authHeader) {
        const token = authHeader.replace(/^Bearer\s+/i, '').trim()
        if (token) {
          this.saveToken(token)
          this.onTokenRefreshed?.()
          return token
        }
      }

      return token
    } catch (error) {
      console.error('Error checking session:', error)
      return null
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
    this.stop()
    this.clearSession()
    this.onSessionExpired?.()
  }

  public start(onSessionExpired: () => void, onTokenRefreshed: () => void): void {
    this.onSessionExpired = onSessionExpired
    this.onTokenRefreshed = onTokenRefreshed

    if (!this.getToken()) {
      return
    }

    if (!this.listenersAttached) {
      const events = ['mousemove', 'mousedown', 'click', 'keydown', 'touchstart', 'scroll']
      events.forEach((event) => {
        document.addEventListener(event, this.activityHandler, { passive: true })
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
      const events = ['mousemove', 'mousedown', 'click', 'keydown', 'touchstart', 'scroll']
      events.forEach((event) => {
        document.removeEventListener(event, this.activityHandler)
      })
      this.listenersAttached = false
    }

    this.onSessionExpired = null
    this.onTokenRefreshed = null
  }

  public isTokenValid(): boolean {
    return !!this.getToken()
  }
}

export const sessionService = new SessionService()
