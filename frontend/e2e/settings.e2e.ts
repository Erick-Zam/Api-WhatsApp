import { expect, test } from '@playwright/test';

test('settings route redirects to modal login without token', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page).toHaveURL(/\/?auth=login/);
    await expect(page.getByText('Welcome back')).toBeVisible();
});
