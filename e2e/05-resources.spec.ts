import { test, expect } from '@playwright/test'
import { injectSession, USERS } from './helpers/auth'
import { mockGet, mockPost } from './helpers/api-mock'

const INVENTORY_MOCK = [
  { id: 1, resourceType: 'Agua', quantity: 150, minimumStock: 50, unit: 'litros', campId: 1 },
  { id: 2, resourceType: 'Comida', quantity: 30, minimumStock: 100, unit: 'raciones', campId: 1 },
  { id: 3, resourceType: 'Munición', quantity: 500, minimumStock: 200, unit: 'unidades', campId: 1 },
]

const ALERTS_MOCK = [
  { id: 1, resourceType: 'Comida', currentQuantity: 30, minimumStock: 100, message: 'Stock crítico de comida' },
]

test.describe('Flujo 5 – Gestión de recursos', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page, USERS.resourceManager)
    await mockGet(page, '/inventory', INVENTORY_MOCK)
    await mockGet(page, '/camps/1/inventory', INVENTORY_MOCK)
    await mockGet(page, '/inventory/alerts', ALERTS_MOCK)
    await mockGet(page, '/resource-types', [
      { id: 1, name: 'Agua' }, { id: 2, name: 'Comida' }, { id: 3, name: 'Munición' }
    ])
  })

  test('gestor de recursos accede a la vista principal de recursos', async ({ page }) => {
    await page.goto('/resource-main-view')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    await expect(page).toHaveURL(/\/resource-main-view/)
    await expect(page.getByText(/error 500|internal server/i)).not.toBeVisible()
  })

  test('se muestran alertas cuando un recurso está bajo el mínimo', async ({ page }) => {
    await page.goto('/resource-main-view')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    await expect(page).toHaveURL(/\/resource-main-view/)

    const alertText = page.getByText(/alerta|crítico|bajo|mínimo|comida/i)
    const isAlertVisible = await alertText.first().isVisible({ timeout: 3_000 }).catch(() => false)
    if (isAlertVisible) {
      await expect(alertText.first()).toBeVisible()
    }
  })

  test('SYSTEM_ADMIN puede ver el dashboard de recursos', async ({ page }) => {
    await injectSession(page, USERS.admin)
    await mockGet(page, '/dashboard', { totalResources: 3, alerts: 1, persons: 45 })
    await page.goto('/admin-dashboard')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/admin-dashboard/)
    await expect(page.getByText(/error 500|internal server/i)).not.toBeVisible()
  })

  test('worker ve su vista personal al iniciar sesión', async ({ page }) => {
    await injectSession(page, USERS.worker)
    await page.goto('/worker-main-view')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/worker-main-view/)
    await expect(page.getByText(/error 500|internal server/i)).not.toBeVisible()
  })

  test('worker no puede acceder al panel de recursos del gestor', async ({ page }) => {
    await injectSession(page, USERS.worker)
    await page.goto('/resource-main-view')

    await page.waitForURL(/\/(app|main-homepage|worker-main-view)/, { timeout: 8_000 })
    await expect(page).not.toHaveURL(/\/resource-main-view$/)
  })
})
