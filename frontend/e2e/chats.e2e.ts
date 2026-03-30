import { expect, test } from '@playwright/test';

test('dashboard chats page renders chat shell', async ({ page }) => {
    await page.goto('/dashboard/chats');
    await expect(page.getByText('Select a chat')).toBeVisible();
});

test('chat drawer can be opened on small viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard/chats');
    await page.getByRole('button', { name: 'Browse chats' }).click();
    await expect(page.getByText('Chats')).toBeVisible();
});
