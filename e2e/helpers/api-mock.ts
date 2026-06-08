import { type Page, type Route } from '@playwright/test'

const API_BASE = process.env.VITE_API_URL ?? 'http://localhost:3000/api'

type MockBody = Record<string, unknown> | unknown[]

function envelope<T>(data: T): { success: true; data: T } {
  return { success: true, data }
}

export async function mockGet(page: Page, path: string, body: MockBody, status = 200): Promise<void> {
  await page.route(`${API_BASE}${path}`, async (route: Route) => {
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(envelope(body)) })
  })
}

export async function mockPost(page: Page, path: string, body: MockBody, status = 201): Promise<void> {
  await page.route(`${API_BASE}${path}`, async (route: Route) => {
    if (route.request().method() !== 'POST') return route.continue()
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(envelope(body)) })
  })
}

export async function mockPut(page: Page, path: string, body: MockBody, status = 200): Promise<void> {
  await page.route(`${API_BASE}${path}`, async (route: Route) => {
    if (route.request().method() !== 'PUT') return route.continue()
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(envelope(body)) })
  })
}

export async function mockLoginEndpoint(page: Page, role: string, campId = 1): Promise<void> {
  await page.route(`${API_BASE}/auth/login`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          token: 'mock-jwt-token-12345',
          accessToken: 'mock-jwt-token-12345',
          user: { id: 1, name: 'Test User', email: 'test@test.com', rol: role, campId },
        },
      }),
    })
  })
}

export async function mockLoginError(page: Page, message = 'Credenciales inválidas'): Promise<void> {
  await page.route(`${API_BASE}/auth/login`, async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message }),
    })
  })
}
