const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("public site loads without runtime errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await expect(page).toHaveTitle(/Woodlife/);
  await expect(page.locator("h1")).toContainText("Интерьер");
  await expect(page.locator("#projects")).toBeVisible();
  await expect(page.locator(".project-card")).toHaveCount(4);
  expect(errors).toEqual([]);
});

test("project filters show relevant work", async ({ page }) => {
  await page.locator('[data-filter="wardrobe"]').click();
  await expect(page.locator('.project-card:not(.hidden)')).toHaveCount(1);
  await expect(page.locator('.project-card:not(.hidden) h3')).toContainText("Белая галактика");

  await page.locator('[data-filter="all"]').click();
  await expect(page.locator('.project-card:not(.hidden)')).toHaveCount(4);
});

test("brief creates a lead in CRM storage", async ({ page }) => {
  await page.locator("[data-open-brief]").first().click();
  await page.locator('label:has(input[value="Кухня"])').click();
  await page.locator("[data-next]").click();
  await page.locator("[data-next]").click();
  await page.locator('label:has(input[value="Пока изучаю"])').click();
  await page.locator("[data-next]").click();
  await page.locator('input[name="name"]').fill("Тестовый клиент");
  await page.locator('input[name="phone"]').fill("+7 900 111-22-33");
  await page.locator("[data-submit]").click();

  await expect(page.locator(".brief-success")).toBeVisible();
  await expect(page.locator(".brief-success")).toContainText("Проект уже начался");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("woodlife_crm_v1")));
  expect(saved.orders[0].client).toBe("Тестовый клиент");
  expect(saved.orders[0].status).toBe("lead");
});

test("client opens order status with project code", async ({ page, isMobile }) => {
  if (isMobile) await page.locator(".menu-button").click();
  await page.locator("[data-open-client]:visible").first().click();
  await page.locator('#client-login input[name="code"]').fill("WL-1042");
  await page.locator("#client-login button").click();

  await expect(page.locator("#client-space")).toBeVisible();
  await expect(page.locator("#client-space")).toContainText("Кухня «Тихий графит»");
  await expect(page.locator("#client-space")).toContainText("Производство");
  await page.locator("#client-space [data-workspace-close]").click();
  await expect(page.locator("#client-space")).toBeHidden();
});

test("admin can navigate CRM and edit an order", async ({ page, isMobile }) => {
  if (isMobile) await page.locator(".menu-button").click();
  await page.locator("[data-open-admin]:visible").first().click();
  await page.locator('#admin-login input[name="pin"]').fill("1640");
  await page.locator("#admin-login button").click();

  await expect(page.locator("#admin-space")).toBeVisible();
  await expect(page.locator("#admin-space")).toContainText("Производственный поток");
  await page.locator('#admin-space [data-admin-nav="orders"]').first().click();
  await page.locator("#order-search").fill("WL-1042");
  await expect(page.locator("#orders-body tr:visible")).toHaveCount(1);
  await page.locator('[data-edit-order="WL-1042"]').click();
  await expect(page.locator("#order-editor")).toBeVisible();
  await page.locator('#order-editor input[name="paid"]').fill("300000");
  await page.locator('#order-editor button[type="submit"]').click();

  const paid = await page.evaluate(() => {
    const crm = JSON.parse(localStorage.getItem("woodlife_crm_v1"));
    return crm.orders.find((order) => order.id === "WL-1042").paid;
  });
  expect(paid).toBe(300000);
});

test("mobile navigation opens and reaches projects", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile-only scenario");
  await page.locator(".menu-button").click();
  await expect(page.locator(".main-nav")).toBeVisible();
  await page.locator('.main-nav a[href="#projects"]').click();
  await expect(page.locator("#projects")).toBeInViewport();
});
