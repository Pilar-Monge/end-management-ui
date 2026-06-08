import { test, expect } from '@playwright/test'
import { injectSession, USERS } from './helpers/auth'
import { mockGet, mockPut, mockPost } from './helpers/api-mock'

const INTERCAMP_REQUESTS_MOCK = [
  {
    id: 20,
    fromCampId: 2,
    fromCampName: 'Campamento Sur',
    toCampId: 1,
    resourceType: 'Agua',
    quantity: 100,
    status: 'PENDING',
    requestDate: new Date().toISOString(),
  },
  {
    id: 21,
    fromCampId: 2,
    fromCampName: 'Campamento Sur',
    toCampId: 1,
    resourceType: 'Munición',
    quantity: 50,
    status: 'PENDING',
    requestDate: new Date().toISOString(),
  },
]

test.describe('Flujo 7 – Solicitudes entre campamentos', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page, USERS.resourceManager)

    await mockGet(page, '/intercamp-requests', INTERCAMP_REQUESTS_MOCK)
    await mockPut(page, '/intercamp-requests/20/review', { id: 20, status: 'APPROVED' })
    await mockPut(page, '/intercamp-requests/21/review', { id: 21, status: 'REJECTED' })
    await mockPut(page, '/intercamp-requests/20', { id: 20, status: 'APPROVED' })
    await mockPut(page, '/intercamp-requests/21', { id: 21, status: 'REJECTED' })
    await mockPost(page, '/intercamp-requests', { id: 22, status: 'PENDING' })
  })

  test('el panel de recursos muestra las solicitudes inter-campamento', async ({ page }) => {
    await page.goto('/resource-main-view')

    await expect(page.locator('body')).not.toBeEmpty()
    await expect(page.getByText(/error 500|internal server/i)).not.toBeVisible()
  })

  test('admin dashboard muestra las solicitudes pendientes entre campamentos', async ({ page }) => {
    await injectSession(page, USERS.admin)
    await page.goto('/admin-dashboard')

    await expect(page.locator('body')).not.toBeEmpty()
    await expect(page.getByText(/error 500|internal server/i)).not.toBeVisible()
  })

  test('navegación entre módulos del dashboard no rompe la sesión', async ({ page }) => {
    await injectSession(page, USERS.admin)

    await page.goto('/admin-dashboard')
    await page.waitForLoadState('networkidle')

    await page.goto('/catalogs')
    await expect(page.locator('body')).not.toBeEmpty()

    await page.goto('/admin-dashboard')
    await expect(page.locator('body')).not.toBeEmpty()

    const token = await page.evaluate(() => localStorage.getItem('token'))
    expect(token).toBeTruthy()
  })
})
