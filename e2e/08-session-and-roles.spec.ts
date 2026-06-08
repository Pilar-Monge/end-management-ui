import { test, expect } from '@playwright/test'
import { injectSession, USERS, clearSession } from './helpers/auth'
import { mockGet } from './helpers/api-mock'

test.describe('Flujo 8 – Control de sesión y roles', () => {
  test('sin sesión, cualquier ruta protegida redirige a main-homepage', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())

    const protectedRoutes = ['/app', '/persons', '/camps', '/expeditions', '/resource-main-view', '/admin-dashboard']

    for (const route of protectedRoutes) {
      await page.goto(route)
      await page.waitForURL(/\/(main-homepage|login)/, { timeout: 8_000 })
      expect(page.url()).toMatch(/\/(main-homepage|login)/)
    }
  })

  test('SYSTEM_ADMIN solo ve rutas de admin habilitadas', async ({ page }) => {
    await injectSession(page, USERS.admin)

    await page.goto('/persons')
    await expect(page).not.toHaveURL(/\/main-homepage|\/login/)

    await page.goto('/camps')
    await expect(page).not.toHaveURL(/\/main-homepage|\/login/)

    await page.goto('/admin-dashboard')
    await expect(page).not.toHaveURL(/\/main-homepage|\/login/)
  })

  test('RESOURCE_MANAGEMENT no puede acceder a /persons ni /camps', async ({ page }) => {
    await injectSession(page, USERS.resourceManager)

    await page.goto('/persons')
    await page.waitForURL(/\/(app|main-homepage)/, { timeout: 8_000 })
    expect(page.url()).not.toMatch(/\/persons$/)

    await page.goto('/camps')
    await page.waitForURL(/\/(app|main-homepage)/, { timeout: 8_000 })
    expect(page.url()).not.toMatch(/\/camps$/)
  })

  test('TRAVEL_MANAGER no puede acceder a /persons ni /resource-main-view', async ({ page }) => {
    await injectSession(page, USERS.travelManager)

    await page.goto('/persons')
    await page.waitForURL(/\/(app|main-homepage)/, { timeout: 8_000 })
    expect(page.url()).not.toMatch(/\/persons$/)

    await page.goto('/resource-main-view')
    await page.waitForURL(/\/(app|main-homepage)/, { timeout: 8_000 })
    expect(page.url()).not.toMatch(/\/resource-main-view$/)
  })

  test('limpiar sesión elimina token y redirige', async ({ page }) => {
    await injectSession(page, USERS.admin)

    let token = await page.evaluate(() => localStorage.getItem('token'))
    expect(token).toBeTruthy()

    await clearSession(page)

    token = await page.evaluate(() => localStorage.getItem('token'))
    expect(token).toBeNull()

    await page.goto('/persons')
    await page.waitForURL(/\/(main-homepage|login)/, { timeout: 8_000 })
  })

  test('sesión inactiva (token vacío) no permite acceder a rutas protegidas', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('token', '')
      localStorage.setItem('user', JSON.stringify({ id: 1, role: 'SYSTEM_ADMIN' }))
    })

    await page.goto('/persons')
    await page.waitForURL(/\/(main-homepage|login)/, { timeout: 8_000 })
  })

  test('la ruta wildcard redirige al home', async ({ page }) => {
    await page.goto('/ruta-inexistente-xyz')

    await page.waitForURL(/\/(|main-homepage)/, { timeout: 8_000 })
    await expect(page).toHaveURL(/\/(|main-homepage)$/)
  })

  test('catálogos (tab de recursos) carga correctamente para SYSTEM_ADMIN', async ({ page }) => {
    await injectSession(page, USERS.admin)
    await mockGet(page, '/resource-types', [{ id: 1, name: 'Agua' }, { id: 2, name: 'Comida' }])

    await page.goto('/catalogs?tab=resources')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/catalogs/)
    await expect(page.getByText(/error 500|internal server/i)).not.toBeVisible()
  })
})
