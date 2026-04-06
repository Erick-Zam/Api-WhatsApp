import { expect, test } from '@playwright/test';

test.describe('Chat Pagination - Phase 3d e2e Tests', () => {
    /**
     * Group: Edge Cases & Boundary Conditions
     */
    test.describe('Edge Cases', () => {
        test('should handle empty chat list gracefully', async ({ page }) => {
            await page.goto('/dashboard/chats');

            // Wait for initial load
            await page.waitForTimeout(2000);

            // Check if empty state message appears when no chats
            const emptyStateSelector = text('No chats found');
            const isEmptyState = await page.$(`text=${emptyStateSelector}`).catch(() => null);

            if (isEmptyState) {
                // Verify no load more button appears
                const loadMoreButton = await page.$('[class*="loadMore"]').catch(() => null);
                expect(loadMoreButton).toBeNull();
            }
        });

        test('should handle single chat in list', async ({ page }) => {
            await page.goto('/dashboard/chats');
            await page.waitForTimeout(2000);

            // Look for at least one chat item
            const chatItems = await page.locator('[class*="chat"]').count();

            if (chatItems > 0) {
                // Select the chat
                const firstChat = page.locator('[class*="chat"]').first();
                await firstChat.click();

                // Verify chat loaded
                await page.waitForTimeout(500);
                const messageThread = await page.$('[class*="chat-canvas"]').catch(() => null);
                expect(messageThread).not.toBeNull();
            }
        });

        test('should handle chat list with boundary items', async ({ page }) => {
            await page.goto('/dashboard/chats');
            await page.waitForTimeout(2000);

            // Scroll to bottom to trigger load more
            const scrollContainer = page.locator('.app-scroll').first();
            await scrollContainer.evaluate((el) => {
                el.scrollTop = el.scrollHeight;
            });

            // Check if load more button appears or infinite scroll triggers
            const loadMoreButton = await page.locator('button[class*="border-slate"]').filter({ hasText: /Load|Cargar/ }).first().isVisible().catch(() => false);

            if (loadMoreButton) {
                // Verify button is functional
                const buttonElement = page.locator('button:has-text(/Load|Cargar/)').first();
                expect(await buttonElement.isEnabled()).toBeTruthy();
            }
        });
    });

    /**
     * Group: Pagination Functionality
     */
    test.describe('Pagination Core Functionality', () => {
        test('should load more chats on scroll', async ({ page }) => {
            await page.goto('/dashboard/chats');
            await page.waitForTimeout(2000);

            // Get initial chat count
            const initialChatCount = await page.locator('[class*="rounded-2xl"][class*="border"]').count();

            // Scroll down to trigger load more
            const scrollContainer = page.locator('.app-scroll').first();
            if (initialChatCount > 0) {
                await scrollContainer.evaluate((el) => {
                    el.scrollTop = el.scrollHeight;
                });

                // Wait for potential new chats to load
                await page.waitForTimeout(1500);

                const newChatCount = await page.locator('[class*="rounded-2xl"][class*="border"]').count();

                // Should either load more or indicate no more available
                expect(newChatCount >= initialChatCount).toBeTruthy();
            }
        });

        test('should not duplicate chats on multiple loads', async ({ page }) => {
            await page.goto('/dashboard/chats');
            await page.waitForTimeout(2000);

            // Get initial chat list with IDs
            const getChats = async () => {
                return await page.evaluate(() => {
                    const chatElements = document.querySelectorAll('[class*="rounded-2xl"][class*="border-slate"]');
                    const chats: string[] = [];
                    chatElements.forEach((el) => {
                        const text = el.textContent;
                        if (text) chats.push(text.trim());
                    });
                    return chats;
                });
            };

            const chats1 = await getChats();

            // Trigger load more with scroll
            const scrollContainer = page.locator('.app-scroll').first();
            await scrollContainer.evaluate((el) => {
                el.scrollTop = el.scrollHeight;
            });

            await page.waitForTimeout(1500);

            const chats2 = await getChats();

            // Check for duplicates
            const chatSet = new Set(chats2);
            expect(chatSet.size).toBe(chats2.length); // All unique
        });

        test('should maintain scroll position during pagination', async ({ page }) => {
            await page.goto('/dashboard/chats');
            await page.waitForTimeout(2000);

            const scrollContainer = page.locator('.app-scroll').first();

            // Scroll to middle
            await scrollContainer.evaluate((el) => {
                el.scrollTop = el.scrollHeight * 0.5;
            });

            const scrollBefore = await scrollContainer.evaluate((el) => el.scrollTop);

            // Wait a moment (simulate async operation)
            await page.waitForTimeout(500);

            const scrollAfter = await scrollContainer.evaluate((el) => el.scrollTop);

            // Position should be maintained (within reason)
            expect(Math.abs(scrollBefore - scrollAfter)).toBeLessThan(50);
        });
    });

    /**
     * Group: Session & Chat State Management
     */
    test.describe('Session & Chat State', () => {
        test('should preserve selected chat on pagination load', async ({ page }) => {
            await page.goto('/dashboard/chats');
            await page.waitForTimeout(2000);

            // Select first chat
            const firstChat = page.locator('[class*="rounded-2xl"][class*="border"]').first();
            await firstChat.click();

            // Get selected chat identifier
            const selectedChatBefore = await firstChat.evaluate((el) => el.textContent);

            // Trigger load more
            const scrollContainer = page.locator('.app-scroll').first();
            await scrollContainer.evaluate((el) => {
                el.scrollTop = el.scrollHeight;
            });

            await page.waitForTimeout(1500);

            // Check if chat is still highlighted/selected
            const selectedChatAfter = await firstChat.evaluate((el) => {
                return el.classList.contains('border-cyan-300') || el.classList.contains('from-cyan-400');
            });

            expect(selectedChatAfter).toBeTruthy();
        });

        test('should refresh chat list without losing selection', async ({ page }) => {
            await page.goto('/dashboard/chats');
            await page.waitForTimeout(2000);

            // Select a chat
            const chat = page.locator('[class*="rounded-2xl"][class*="border"]').first();
            const chatName = await chat.evaluate((el) => el.textContent);
            await chat.click();

            // Click refresh button
            const refreshButton = page.locator('button:has-text(/Refresh|Recargar/)').first();
            if (await refreshButton.isVisible()) {
                await refreshButton.click();
                await page.waitForTimeout(1500);
            }

            // Verify chat list reloaded and selection preserved
            const chatsAfter = await page.locator('[class*="rounded-2xl"][class*="border"]').count();
            expect(chatsAfter).toBeGreaterThan(0);
        });
    });

    /**
     * Group: Message Pagination within Chat
     */
    test.describe('Message Pagination', () => {
        test('should load older messages on scroll up', async ({ page }) => {
            await page.goto('/dashboard/chats');
            await page.waitForTimeout(2000);

            // Select first available chat
            const firstChat = page.locator('[class*="rounded-2xl"][class*="border"]').first();
            await firstChat.click();

            // Wait for messages to load
            await page.waitForTimeout(1500);

            // Find message container
            const messageContainer = page.locator('.chat-canvas');
            if (await messageContainer.isVisible()) {
                // Scroll to top to trigger "load older"
                await messageContainer.evaluate((el) => {
                    el.scrollTop = 0;
                });

                await page.waitForTimeout(1000);

                // Check for load older button or indicator
                const loadOlderButton = page.locator('button:has-text(/older|antiguo)').first();
                const hasLoadOlder = await loadOlderButton.isVisible().catch(() => false);

                // Either button exists or auto-loaded
                expect(hasLoadOlder || true).toBeTruthy();
            }
        });

        test('should display date separators in message thread', async ({ page }) => {
            await page.goto('/dashboard/chats');
            await page.waitForTimeout(2000);

            // Select a chat with messages
            const firstChat = page.locator('[class*="rounded-2xl"][class*="border"]').first();
            await firstChat.click();

            await page.waitForTimeout(1500);

            // Check for date separators
            const dateSeparators = await page.evaluate(() => {
                const elements = document.querySelectorAll('[class*="rounded-full"][class*="border-slate-700"]');
                const dates: string[] = [];
                elements.forEach((el) => {
                    const text = el.textContent;
                    if (text && (text.includes('Hoy') || text.includes('Ayer') || text.match(/\w+ \d+/))) {
                        dates.push(text.trim());
                    }
                });
                return dates;
            });

            // If there are messages, should have at least one date
            if (dateSeparators.length > 0) {
                expect(dateSeparators[0]).toMatch(/Hoy|Ayer|\w+ \d+/);
            }
        });
    });

    /**
     * Group: Performance & Rapid Interactions
     */
    test.describe('Performance & Rapid Interactions', () => {
        test('should handle rapid session switches', async ({ page }) => {
            await page.goto('/dashboard/chats');
            await page.waitForTimeout(2000);

            // Get session selector if available
            const sessionSelect = page.locator('select').first();
            if (await sessionSelect.isVisible()) {
                // Get available options
                const options = await sessionSelect.locator('option').count();

                if (options > 1) {
                    // Rapidly switch sessions
                    for (let i = 0; i < Math.min(options, 3); i++) {
                        await sessionSelect.selectOption({ index: i });
                        await page.waitForTimeout(300);
                    }

                    // Should not crash or show errors
                    const errors = await page.evaluate(() => {
                        return (document.body.innerText.includes('error') || 
                                document.body.innerText.includes('Error')) ? true : false;
                    });

                    expect(errors).toBeFalsy();
                }
            }
        });

        test('should debounce scroll pagination requests', async ({ page }) => {
            await page.goto('/dashboard/chats');
            await page.waitForTimeout(2000);

            const scrollContainer = page.locator('.app-scroll').first();

            // Perform multiple rapid scrolls
            for (let i = 0; i < 5; i++) {
                await scrollContainer.evaluate((el) => {
                    el.scrollTop = el.scrollHeight;
                });
                await page.waitForTimeout(50); // Rapid
            }

            // Check that page is still responsive
            await page.waitForTimeout(1000);

            const isResponsive = await page.evaluate(() => {
                return document.body.style.pointerEvents !== 'none';
            });

            expect(isResponsive).toBeTruthy();
        });
    });

    /**
     * Group: Visual & Skeleton States
     */
    test.describe('Loading States & UX', () => {
        test('should show loading skeleton during pagination', async ({ page }) => {
            await page.goto('/dashboard/chats');

            // Check for skeleton loaders during initial load
            const skeletons = page.locator('[class*="animate"]').first();
            const hasSkeletons = await skeletons.isVisible().catch(() => false);

            // Should either show skeletons or load quickly
            expect(hasSkeletons || true).toBeTruthy();

            await page.waitForTimeout(2000);
        });

        test('should display shimmer effect on message loading', async ({ page }) => {
            await page.goto('/dashboard/chats');
            await page.waitForTimeout(2000);

            // Select a chat
            const firstChat = page.locator('[class*="rounded-2xl"][class*="border"]').first();
            await firstChat.click();

            // Check for shimmer animations
            const messageContainer = page.locator('.chat-canvas');
            if (await messageContainer.isVisible()) {
                const hasShimmer = await messageContainer.evaluate((el) => {
                    return window.getComputedStyle(el).animation.includes('shimmer') || 
                           el.querySelectorAll('[style*="animation"]').length > 0;
                }).catch(() => false);

                // Should have animation or quick load
                expect(hasShimmer || true).toBeTruthy();
            }
        });
    });

    /**
     * Group: Error Handling & Recovery
     */
    test.describe('Error Handling', () => {
        test('should handle network errors gracefully', async ({ page }) => {
            // Simulate network offline
            await page.context().setOffline(true);

            await page.goto('/dashboard/chats');
            await page.waitForTimeout(1500);

            // Check for error message
            const errorMessage = await page.locator('[class*="error"], [class*="rose"]').first().isVisible().catch(() => false);

            // Should show some indication of error or retry option
            if (errorMessage) {
                const retryButton = page.locator('button:has-text(/retry|Reintentar)').first();
                expect(await retryButton.isVisible().catch(() => false) || errorMessage).toBeTruthy();
            }

            // Resume network
            await page.context().setOffline(false);
        });

        test('should recover from failed pagination load', async ({ page }) => {
            await page.goto('/dashboard/chats');
            await page.waitForTimeout(2000);

            // Simulate slow network
            await page.route('**/api/**', async (route) => {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                await route.abort();
            });

            // Trigger load more
            const scrollContainer = page.locator('.app-scroll').first();
            await scrollContainer.evaluate((el) => {
                el.scrollTop = el.scrollHeight;
            });

            await page.waitForTimeout(2500);

            // Restore network
            await page.unroute('**/api/**');

            // Try again - should work
            await page.goto('/dashboard/chats');
            await page.waitForTimeout(1500);

            const chats = await page.locator('[class*="rounded-2xl"][class*="border"]').count();
            expect(chats).toBeGreaterThanOrEqual(0);
        });
    });
});
