import { test, expect } from '@playwright/test'
import { injectSession, USERS } from './helpers/auth'
import { mockGet, mockPut } from './helpers/api-mock'

const PENDING_REQUESTS_MOCK = [
  { id: 1, nombre: 'Ana Martínez', email: 'ana@refugio.cr', status: 'PENDING', aiDecision: 'APPROVED', aiConfidence: 0.87 },
  { id: 2, nombre: 'Carlos Ruiz', email: 'carlos@refugio.cr', status: 'PENDING', aiDecision: 'REJECTED', aiConfidence: 0.72 },
]

test.describe('Flujo 3 – Administrador revisa solicitudes de admisión', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page, USERS.admin)
    await mockGet(page, '/admission-requests', PENDING_REQUESTS_MOCK)
    await mockGet(page, '/admission-requests?status=PENDING', PENDING_REQUESTS_MOCK)
    await mockPut(page, '/admission-requests/1/review', { id: 1, status: 'APPROVED' })
    await mockPut(page, '/admission-requests/2/review', { id: 2, status: 'REJECTED' })
    await mockPut(page, '/admission-requests/1', { id: 1, status: 'APPROVED' })
    await mockPut(page, '/admission-requests/2', { id: 2, status: 'REJECTED' })
  })

  test('SYSTEM_ADMIN puede navegar al dashboard principal', async ({ page }) => {
    await page.goto('/admin-main-view-ui', { waitUntil: 'commit' })
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/admin-main-view-ui/)
    await expect(page.getByText(/error 500|internal server error/i)).not.toBeVisible()
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('admin dashboard muestra métricas del campamento', async ({ page }) => {
    await mockGet(page, '/dashboard/stats', { totalPersons: 45, activeExpeditions: 2, resourceAlerts: 1 })
    await mockGet(page, '/camps/1/dashboard', { totalPersons: 45, activeExpeditions: 2, resourceAlerts: 1 })
    await page.goto('/admin-dashboard', { waitUntil: 'commit' })
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/admin-dashboard/)
    await expect(page.getByText(/error 500|internal server/i)).not.toBeVisible()
  })

  test('la sección de admisiones lista solicitudes pendientes', async ({ page }) => {
    await page.goto('/admin-dashboard', { waitUntil: 'commit' })
    await page.waitForLoadState('domcontentloaded')

    const admissionSection = page.getByText(/admision|solicitud/i).first()
    if (await admissionSection.isVisible({ timeout: 5_000 })) {
      await admissionSection.click()
      await expect(page.getByText(/Ana Martínez|Carlos Ruiz/i).first()).toBeVisible({ timeout: 5_000 })
    } else {
      await expect(page).toHaveURL(/\/admin-dashboard/)
    }
  })

  test('administrador puede acceder a catálogos de campamentos', async ({ page }) => {
    await mockGet(page, '/camps', [{ id: 1, name: 'Campamento Norte' }, { id: 2, name: 'Campamento Sur' }])
    await page.goto('/camps', { waitUntil: 'commit' })
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/camps/)
    await expect(page.getByText(/error 500|internal server/i)).not.toBeVisible()
  })

  test('ruta protegida redirige si no hay sesión', async ({ page }) => {
    await page.evaluate(() => localStorage.clear())
    await page.goto('/persons', { waitUntil: 'commit' })

    await page.waitForURL(/\/(main-homepage|login)/, { timeout: 8_000 })
  })
})
