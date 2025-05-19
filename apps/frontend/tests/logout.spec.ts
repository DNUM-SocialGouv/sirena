import { test, expect } from '@playwright/test';
import {loginUrl, user, password} from "./utils";

test('logout', async ({ page }) => {

    // Given
    await page.goto(loginUrl);

    // Click the login link.
    await page.getByRole('link', { name: 'S’identifier avec ProConnect' }).click();

    const userInput = page.getByRole('textbox', { name: 'Email professionnel Format' })
    await userInput.fill(user)
    const loginButton = page.getByTestId('interaction-connection-button')
    await loginButton.click()
    const passwordInput = page.getByRole('textbox', { name: 'Renseignez votre mot de passe' })
    await passwordInput.fill(password)
    const logButton = page.getByRole('button', { name: 'S’identifier' })
    await logButton.click()
    const locationSelector = page.getByRole('button', { name: 'Commune de gap - Mairie (' })
    await locationSelector.click()

    // When
    await page.goto(loginUrl);
    const logoutButton = page.getByRole('button', { name: 'Logout' })
    await logoutButton.click()
    // Then
    await expect(page).toHaveURL('http://localhost:5173/login')
})
