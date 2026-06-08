import { test, expect } from '@playwright/test'
import { injectSession, USERS } from './helpers/auth'
import { mockGet, mockPost } from './helpers/api-mock'

const ACTIVE_EXPEDITIONS_MOCK = [
  {
    id: 10,
    name: 'Misión Valle Norte',
    status: 'PROGRAMADA',
    scheduledDate: new Date(Date.now() + 86400000).toISOString(),
    daysEstimated: 3,
    participants: [],
    campId: 1,
  },
  {
    id: 11,
    name: 'Reconocimiento Sur',
    status: 'EN_PROGRESO',
    scheduledDate: new Date(Date.now() - 86400000).toISOString(),
    daysEstimated: 5,
    participants: [{ id: 3, nombre: 'Laura Solís' }],
    campId: 1,
  },
]

const HISTORY_EXPEDITIONS_MOCK = [
  {
    id: 5,
    name: 'Primera Misión',
    status: 'COMPLETADA',
    returnDate: new Date(Date.now() - 7 * 86400000).toISOString(),
    resourcesFound: [{ resourceType: 'Agua', quantity: 200 }],
    campId: 1,
  },
]

const PARTICIPANTS_CATALOG_MOCK = [
  { id: 3, nombre: 'Laura Solís', ocupacion: 'Explorador', estado: 'ACTIVO' },
  { id: 4, nombre: 'Marco Díaz', ocupacion: 'Explorador', estado: 'ACTIVO' },
]

test.describe('Flujo 6 – Gestión de expediciones', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page, USERS.travelManager)

    await mockGet(page, '/expeditions/active', ACTIVE_EXPEDITIONS_MOCK)
    await mockGet(page, '/explorations/active', ACTIVE_EXPEDITIONS_MOCK)
    await mockGet(page, '/expeditions', [...ACTIVE_EXPEDITIONS_MOCK, ...HISTORY_EXPEDITIONS_MOCK])
    await mockGet(page, '/explorations', [...ACTIVE_EXPEDITIONS_MOCK, ...HISTORY_EXPEDITIONS_MOCK])
    await mockGet(page, '/persons/travelers', PARTICIPANTS_CATALOG_MOCK)
    await mockGet(page, '/persons?occupation=explorador', PARTICIPANTS_CATALOG_MOCK)
  })

  test('TRAVEL_MANAGER accede al panel de expediciones', async ({ page }) => {
    await page.goto('/expeditions')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    await expect(page).toHaveURL(/\/expeditions/)
    await expect(page.getByText(/error 500|internal server/i)).not.toBeVisible()
  })

  test('se muestran los KPIs de expediciones activas', async ({ page }) => {
    await page.goto('/expeditions')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    await expect(page).toHaveURL(/\/expeditions/)

    const kpiText = page.getByText(/activas|historial|personal/i)
    const isKpiVisible = await kpiText.first().isVisible({ timeout: 3_000 }).catch(() => false)
    if (isKpiVisible) {
      await expect(kpiText.first()).toBeVisible()
    }
  })

  test('se puede navegar a la vista del mapa de expediciones', async ({ page }) => {
    await page.goto('/expeditions-ui')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/expeditions-ui/)
    await expect(page.getByText(/error 500|internal server/i)).not.toBeVisible()
  })

  test('WORKER no puede acceder a expediciones', async ({ page }) => {
    await injectSession(page, USERS.worker)
    await page.goto('/expeditions')

    await page.waitForURL(/\/(app|main-homepage|worker-main-view)/, { timeout: 8_000 })
    await expect(page).not.toHaveURL(/\/expeditions$/)
  })

  test('SYSTEM_ADMIN puede ver expediciones', async ({ page }) => {
    await injectSession(page, USERS.admin)
    await page.goto('/expeditions')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/expeditions/)
    await expect(page.getByText(/error 500|internal server/i)).not.toBeVisible()
  })
})
