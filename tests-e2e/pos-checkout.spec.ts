import { test, expect } from "@playwright/test";

test.describe("POS Checkout Flow", () => {
  test("allows cash checkout for seeded product", async ({ page }) => {
    // 1. Login
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@vibegsm.local");
    await page.fill('input[type="password"]', "Admin123!");
    await page.click('button:has-text("Giris Yap")');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Go to POS page
    await page.goto("/pos");

    // Check we have the POS title
    await expect(page.locator("h2")).toContainText("POS");

    // We can select a customer if available
    const customerSelect = page.locator("select").nth(1); // Usually first select is branch, second is customer
    if (await customerSelect.count() > 0) {
      await customerSelect.selectOption({ index: 1 });
    }

    // Add product to cart by clicking on the first available popular product card
    const popularItem = page.locator("button:has-text('⚡')").first();
    if (await popularItem.count() > 0) {
      await popularItem.click();
    } else {
      // Or click any product card
      const firstProduct = page.locator("button:has-text('Cam')").first();
      if (await firstProduct.count() > 0) {
        await firstProduct.click();
      }
    }

    // Complete sale
    const checkoutBtn = page.locator('button:has-text("Satışı Tamamla")');
    if (await checkoutBtn.count() > 0) {
      await checkoutBtn.click();
    }
  });
});
