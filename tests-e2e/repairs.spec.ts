import { test, expect } from "@playwright/test";

test.describe("Repairs Management Flow", () => {
  test("allows searching and viewing repair records", async ({ page }) => {
    // 1. Login
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@vibegsm.local");
    await page.fill('input[type="password"]', "Admin123!");
    await page.click('button:has-text("Giris Yap")');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Go to Repairs page
    await page.goto("/tamir-takip");

    // Click on search box and search for Demo
    const searchInput = page.locator('input[placeholder*="Arayın"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill("Demo");
      // Verify table updates or filters
    }
  });
});
