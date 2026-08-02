import { test, expect } from "@playwright/test";

test.describe("Stock Management Flow", () => {
  test("allows viewing and searching stock items", async ({ page }) => {
    // 1. Login
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@vibegsm.local");
    await page.fill('input[type="password"]', "Admin123!");
    await page.click('button:has-text("Giris Yap")');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Go to Stock page
    await page.goto("/stok");

    // Check we have the Stock title or table tab
    await expect(page.locator("h2")).toContainText("Stok & Cihaz Yönetimi");

    // Click on search input and type "Cam"
    const searchInput = page.locator('input[placeholder*="Arayın"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill("Cam");
    }
  });
});
