import { test, expect, type Page } from '@playwright/test'
import { mockLoginEndpoint, mockLoginError } from './helpers/api-mock'

const API_BASE = process.env.VITE_API_URL ?? 'http://localhost:3000/api'
const SUBMIT_BTN = 'button[type="submit"]'

async function mockCamps(page: Page) {
  await page.route(`${API_BASE}/camps**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [{ id: 1, name: 'Campamento Norte' }] }),
    })
  })
}

test.describe('Flujo 1 – Inicio de sesión', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('muestra la pantalla de bienvenida al entrar a /login', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByText(/Gestión del Fin/i).first()).toBeVisible()
    await expect(page.getByText(/acceso restringido al refugio/i)).toBeVisible()
    await expect(page.locator('button[type="button"]', { hasText: /iniciar sesión/i }).first()).toBeVisible()
    await expect(page.getByPlaceholder(/nombre de usuario/i)).not.toBeVisible()
  })

  test('al hacer click en "Iniciar sesión" aparece el formulario', async ({ page }) => {
    await page.goto('/login')
    await page.locator('button[type="button"]', { hasText: /iniciar sesión/i }).first().click()

    await expect(page.getByPlaceholder(/nombre de usuario/i)).toBeVisible()
    await expect(page.getByPlaceholder(/••••••••/i)).toBeVisible()
    await expect(page.locator(SUBMIT_BTN)).toBeVisible()
  })

  test('login exitoso como SYSTEM_ADMIN redirige al panel de administración', async ({ page }) => {
    await mockCamps(page)
    await mockLoginEndpoint(page, 'SYSTEM_ADMIN', 1)

    await page.evaluate(() => localStorage.setItem('last_selected_camp_id', '1'))

    await page.goto('/login')
    await page.locator('button[type="button"]', { hasText: /iniciar sesión/i }).first().click()

    await page.getByPlaceholder(/nombre de usuario/i).fill('admin')
    await page.getByPlaceholder(/••••••••/i).fill('admin123')

    await page.locator(SUBMIT_BTN).click()

    await page.waitForURL(/\/(loading|admin-main-view-ui|app)/, { timeout: 20_000 })
    await expect(page).toHaveURL(/\/(loading|admin-main-view-ui|app)/)
  })

  test('login fallido muestra mensaje de error', async ({ page }) => {
    await mockCamps(page)
    await mockLoginError(page, 'Credenciales invalidas')

    await page.evaluate(() => localStorage.setItem('last_selected_camp_id', '1'))

    await page.goto('/login')
    await page.locator('button[type="button"]', { hasText: /iniciar sesión/i }).first().click()

    await page.getByPlaceholder(/nombre de usuario/i).fill('usuario_invalido')
    await page.getByPlaceholder(/••••••••/i).fill('pass_invalida')
    await page.locator(SUBMIT_BTN).click()

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('intento de login sin campamento seleccionado muestra advertencia', async ({ page }) => {
    await page.goto('/login')
    await page.locator('button[type="button"]', { hasText: /iniciar sesión/i }).first().click()

    await page.getByPlaceholder(/nombre de usuario/i).fill('admin')
    await page.getByPlaceholder(/••••••••/i).fill('admin123')
    await page.locator(SUBMIT_BTN).click()

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('validación: usuario y contraseña muy cortos muestran error', async ({ page }) => {
    await page.goto('/login')
    await page.locator('button[type="button"]', { hasText: /iniciar sesión/i }).first().click()

    await page.getByPlaceholder(/nombre de usuario/i).fill('ab')
    await page.getByPlaceholder(/••••••••/i).fill('123')
    await page.locator(SUBMIT_BTN).click()

    await expect(page.getByText(/mínimo 3 caracteres/i)).toBeVisible()
    await expect(page.getByText(/mínimo 6 caracteres/i)).toBeVisible()
  })
})
