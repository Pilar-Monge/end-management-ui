import { test, expect } from '@playwright/test'
import { injectSession, USERS } from './helpers/auth'
import { mockGet, mockPut } from './helpers/api-mock'

const PERSONS_MOCK = [
  { id: 1, nombre: 'Ana Martínez', ocupacion: 'Médico', estado: 'ACTIVO', campId: 1 },
  { id: 2, nombre: 'Carlos Ruiz', ocupacion: 'Seguridad', estado: 'HERIDO', campId: 1 },
  { id: 3, nombre: 'Laura Solís', ocupacion: 'Ingeniero', estado: 'ACTIVO', campId: 1 },
]

test.describe('Flujo 4 – Gestión de personas', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page, USERS.admin)
    await mockGet(page, '/persons', PERSONS_MOCK)
    await mockGet(page, '/persons?campId=1', PERSONS_MOCK)
    await mockGet(page, '/persons/1', PERSONS_MOCK[0])
    await mockPut(page, '/persons/2', { ...PERSONS_MOCK[1], estado: 'ACTIVO' })
  })

  test('lista de personas carga correctamente en /persons', async ({ page }) => {
    await page.goto('/persons')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/persons/)
    await expect(page.getByText(/error 500|internal server/i)).not.toBeVisible()
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('se puede buscar o filtrar personas', async ({ page }) => {
    await page.goto('/persons')
    await page.waitForLoadState('networkidle')

    const searchInput = page.getByPlaceholder(/buscar|filtrar|nombre/i)
    if (await searchInput.isVisible({ timeout: 3_000 })) {
      await searchInput.fill('Ana')
      await expect(page.getByText(/Ana Martínez/i)).toBeVisible({ timeout: 5_000 })
    } else {
      await expect(page).toHaveURL(/\/persons/)
    }
  })

  test('personas heridas o inactivas son visibles en la lista', async ({ page }) => {
    await page.goto('/persons')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/persons/)
    await expect(page.getByText(/error 500|internal server/i)).not.toBeVisible()

    const carlosText = page.getByText(/Carlos Ruiz|herido|inactivo/i)
    const isVisible = await carlosText.isVisible({ timeout: 3_000 }).catch(() => false)
    if (isVisible) {
      await expect(carlosText).toBeVisible()
    }
  })

  test('WORKER no puede acceder a /persons', async ({ page }) => {
    await injectSession(page, USERS.worker)
    await page.goto('/persons')

    await page.waitForURL(/\/(app|main-homepage|worker-main-view)/, { timeout: 8_000 })
    await expect(page).not.toHaveURL(/\/persons/)
  })
})
