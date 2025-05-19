import { test, expect } from '@playwright/test';

const user = 'user@yopmail.com'
const password = 'user@yopmail.com'
const loginPage = 'http://localhost:5173/login'


test('login', async ({ page }) => {
    await page.goto(loginPage);

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
    await expect(page).toHaveURL('http://localhost:5173/home')
    expect(page).not.toHaveTitle('Login')
    await page.goto(loginPage)
    await expect(page).toHaveURL('http://localhost:5173/home')
});
