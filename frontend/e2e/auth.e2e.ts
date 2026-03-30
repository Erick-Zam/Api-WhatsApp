import { expect, test } from '@playwright/test';

test('login route redirects to modal flow', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/?auth=login/);
    await expect(page.getByText('Welcome back')).toBeVisible();
});

test('register route redirects to modal flow', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/\/?auth=register/);
    await expect(page.getByText('Create your workspace')).toBeVisible();
});

test('home opens auth modal in login mode by query', async ({ page }) => {
    await page.goto('/?auth=login');
    await expect(page.getByPlaceholder('team@company.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});
