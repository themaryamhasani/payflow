import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("payflow-demo-guide-dismissed", "1");
    window.localStorage.removeItem("payflow-wallet-state-v1");
  });
});

test("home page renders the brand and case-study framing", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));

  await page.goto("/");
  await expect(page.getByRole("link", { name: "PayFlow" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /هر ریال/ })).toBeVisible();
  await expect(page.getByText(/مطالعه موردی|نمونه‌کار|sandbox/i).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("wallet smoke: login, run transfer scenario, open history", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));

  await page.goto("/wallet");
  await page.getByRole("button", { name: "پر کردن اطلاعات نمونه" }).click();
  await page.getByRole("button", { name: "ورود" }).click();
  await expect(page.getByText("سارا محمدی")).toBeVisible();

  await page.getByRole("button", { name: "انتقال ساده" }).click();
  await expect(page.getByText("سناریوی انتقال اجرا شد", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "تاریخچه" })).toBeVisible();
  await expect(page.getByRole("button", { name: /انتقال خروجی/ }).first()).toBeVisible();

  expect(errors).toEqual([]);
});
