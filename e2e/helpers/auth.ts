import { type Page } from '@playwright/test'

export interface TestUser {
  username: string
  password: string
  role: 'SYSTEM_ADMIN' | 'RESOURCE_MANAGEMENT' | 'TRAVEL_MANAGER' | 'WORKER'
  campId: number
}

export const USERS = {
  admin: {
    username: process.env.TEST_ADMIN_USER ?? 'admin',
    password: process.env.TEST_ADMIN_PASS ?? 'admin123',
    role: 'SYSTEM_ADMIN' as const,
    campId: Number(process.env.TEST_CAMP_ID ?? '1'),
  },
  resourceManager: {
    username: process.env.TEST_RESOURCE_USER ?? 'recursos1',
    password: process.env.TEST_RESOURCE_PASS ?? 'recursos123',
    role: 'RESOURCE_MANAGEMENT' as const,
    campId: Number(process.env.TEST_CAMP_ID ?? '1'),
  },
  travelManager: {
    username: process.env.TEST_TRAVEL_USER ?? 'viajes1',
    password: process.env.TEST_TRAVEL_PASS ?? 'viajes123',
    role: 'TRAVEL_MANAGER' as const,
    campId: Number(process.env.TEST_CAMP_ID ?? '1'),
  },
  worker: {
    username: process.env.TEST_WORKER_USER ?? 'trabajador1',
    password: process.env.TEST_WORKER_PASS ?? 'trabajador123',
    role: 'WORKER' as const,
    campId: Number(process.env.TEST_CAMP_ID ?? '1'),
  },
} satisfies Record<string, TestUser>

export async function loginAs(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login')

  const accessButton = page.getByRole('button', { name: /iniciar sesión/i }).first()
  await accessButton.waitFor({ state: 'visible' })
  await accessButton.click()

  await page.getByLabel(/usuario/i).fill(user.username)
  await page.getByLabel(/contraseña/i).fill(user.password)

  await page.getByRole('button', { name: /^iniciar sesión$/i }).click()

  await page.waitForURL(/\/(loading|admin-main-view-ui|resource-main-view|expeditions|worker-main-view|app)/, {
    timeout: 20_000,
  })
}

export async function injectSession(page: Page, user: TestUser, token = 'fake-test-token'): Promise<void> {
  await page.goto('/')
  await page.evaluate(
    ({ u, t }) => {
      localStorage.setItem('token', t)
      localStorage.setItem('accessToken', t)
      localStorage.setItem(
        'user',
        JSON.stringify({ id: 1, name: u.username, email: `${u.username}@test.com`, role: u.role, campId: u.campId }),
      )
      localStorage.setItem('last_selected_camp_id', String(u.campId))
    },
    { u: user, t: token },
  )
}

export async function clearSession(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    localStorage.removeItem('last_selected_camp_id')
    localStorage.removeItem('postLoadingRoute')
    localStorage.removeItem('last_secure_path')
  })
}
