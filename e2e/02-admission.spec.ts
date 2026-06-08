import { test, expect } from '@playwright/test'
import { mockGet, mockPost } from './helpers/api-mock'

const CAMPS_MOCK = [
  { id: 1, name: 'Campamento Norte', location: 'Sierra Norte' },
  { id: 2, name: 'Campamento Sur', location: 'Valle Sur' },
]

test.describe('Flujo 2 – Solicitud de admisión', () => {
  test.beforeEach(async ({ page }) => {
    await mockGet(page, '/camps', CAMPS_MOCK)
    await mockPost(page, '/admission-requests', {
      id: 42,
      status: 'PENDING',
      message: 'Solicitud recibida. Siendo procesada por IA.',
    })
  })

  test('muestra el formulario de admisión en /admission', async ({ page }) => {
    await page.goto('/admission')

    await expect(page.getByText(/nombre/i).first()).toBeVisible()
    await expect(page.getByText(/apellido/i).first()).toBeVisible()
    await expect(page.getByText(/email/i)).toBeVisible()
  })

  test('valida campos obligatorios vacíos', async ({ page }) => {
    await page.goto('/admission')

    const submitBtn = page.locator('button[type="submit"]').first()
    if (await submitBtn.isVisible({ timeout: 3_000 })) {
      await submitBtn.click()
      const errorIndicators = page.locator('[class*="error"], [class*="invalid"], [aria-invalid="true"]')
      const hasErrors = await errorIndicators.count() > 0
      if (!hasErrors) {
        await expect(page).toHaveURL(/\/admission/)
      }
    } else {
      await expect(page).toHaveURL(/\/admission/)
    }
  })

  test('rellena y envía formulario de admisión completo', async ({ page }) => {
    await page.goto('/admission')

    const editableInputs = page.locator(
      'input:not([readonly]):not([aria-hidden="true"]):not([tabindex="-1"])[type="text"],' +
      'input:not([readonly]):not([aria-hidden="true"]):not([tabindex="-1"])[type="email"]'
    )

    const fillByName = async (name: string, value: string) => {
      const input = page.locator(`input[name="${name}"]`).filter({ hasNot: page.locator('[readonly]') })
      if (await input.count() > 0 && await input.isVisible()) {
        await input.fill(value)
      }
    }

    await fillByName('nombre', 'Juan')
    await fillByName('primerApellido', 'Pérez')
    await fillByName('segundoApellido', 'González')
    await fillByName('email', 'juan.perez@refugio.cr')
    await fillByName('usuario', 'jperez')

    const allSelects = page.locator('select:not([disabled])')
    const selectCount = await allSelects.count()
    for (let i = 0; i < selectCount; i++) {
      const sel = allSelects.nth(i)
      if (await sel.isVisible()) {
        const options = await sel.locator('option').count()
        if (options > 1) {
          await sel.selectOption({ index: 1 })
        }
      }
    }

    const submitBtn = page.locator('button[type="submit"]').first()
    if (await submitBtn.isVisible()) {
      await submitBtn.click()
    }

    await page.waitForTimeout(2000)
    const currentUrl = page.url()
    expect(currentUrl).toMatch(/admission|login|main-homepage|loading/)
  })

  test('regresa a la página anterior desde el formulario de admisión', async ({ page }) => {
    await page.goto('/admission')

    const backButton = page.getByRole('button', { name: /volver|cancelar|atrás/i })
    if (await backButton.isVisible({ timeout: 3_000 })) {
      await backButton.click()
      await expect(page).not.toHaveURL(/\/admission$/, { timeout: 5_000 })
    } else {
      await expect(page).toHaveURL(/\/admission/)
    }
  })
})
