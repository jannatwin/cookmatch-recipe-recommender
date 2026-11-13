import { expect, test, type Page } from "@playwright/test";

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

async function addIngredient(page: Page, text: string, expiry?: string) {
  await page.getByLabel("Ingredients", { exact: true }).fill(text);
  if (expiry) await page.locator("#new-expiry").fill(expiry);
  await page.getByRole("button", { name: "Add to pantry" }).click();
}

test("main journey: register, pantry, recommendations, recipe, cooking, sign out", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  // Signed-out visitors are sent to sign in, and a broken confirmation link is explained.
  await page.goto("/pantry");
  await expect(page).toHaveURL(/\/login\?next=%2Fpantry/);
  await page.goto("/login?error=auth_callback");
  await expect(page.locator("p[role=alert]")).toContainText("confirmation link is invalid");
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { name: "We couldn’t find that page" })).toBeVisible();

  await page.goto("/register");
  await page.getByLabel("Your name").fill("E2E Cook");
  await page.getByLabel("Email address").fill(`e2e-${testInfo.project.name}-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/pantry$/);
  await expect(page.getByText("Your pantry is ready for a first ingredient")).toBeVisible();
  await page.goto("/recipes");
  await page.getByLabel("Cuisine").selectOption({ label: "Italian" });
  await expect(page.getByRole("heading", { name: "Your pantry is empty" })).toBeVisible();
  await page.goto("/pantry");
  expect((await page.request.get("/icon.svg")).status()).toBe(200);

  // Suggestion pick, alias typed directly, expiry date, and an unknown name.
  await page.getByLabel("Ingredients", { exact: true }).fill("eg");
  await page.getByRole("option", { name: /Egg/ }).click();
  await page.getByRole("button", { name: "Add to pantry" }).click();
  await expect(page.locator("p[role=status]").filter({ hasText: "Egg added" })).toBeVisible();
  await addIngredient(page, "piyaj");
  await expect(page.locator("p[role=status]").filter({ hasText: "Onion added" })).toBeVisible();
  await addIngredient(page, "Tomato", inDays(2));
  await expect(page.locator("p[role=status]").filter({ hasText: "Tomato added" })).toBeVisible();
  // Several at once: the known ones are added, the unknown one stays in the box to fix.
  await addIngredient(page, "Oil, salt, qqqq");
  await expect(page.locator("p[role=status]").filter({ hasText: "Oil, Salt added" })).toBeVisible();
  await expect(page.locator("p[role=alert]")).toContainText(
    "‘qqqq’ was not recognized".replace(/[‘’]/g, "'"),
  );
  await expect(page.getByLabel("Ingredients", { exact: true })).toHaveValue("qqqq");
  await expect(page.getByText("Use soon: 1")).toBeVisible();
  await page.getByLabel("Ingredients", { exact: true }).fill("zzzz");
  await expect(page.getByText("No ingredient matches “zzzz”")).toBeVisible();
  await addIngredient(page, "Egg");
  await expect(page.locator("p[role=alert]")).toContainText("already in the pantry");

  // Ranking: both full matches first, the one using the expiring tomato on top.
  await page.goto("/recipes");
  const cards = page.locator("article h2");
  await expect(cards.first()).toHaveText("Tomato Egg Curry");
  await expect(cards.nth(1)).toHaveText("Plain Omelette");
  const friedRice = page.locator("article", { hasText: "Fried Rice" });
  // Rice and butter are missing; salt is a staple and counts a quarter: 2.25 of 4.25.
  await expect(friedRice).toContainText("53%");
  await expect(friedRice).toContainText("Almost there · 2 missing");
  await expect(friedRice).toContainText("Butter · or use Oil");
  await expect(page.locator("article", { hasText: "Tomato Egg Curry" })).toContainText(
    "Uses 1 ingredient expiring soon",
  );

  // Filters combine and keep the order.
  await page.getByLabel("Cuisine").selectOption({ label: "Italian" });
  await expect(cards.first()).toHaveText("Plain Omelette");
  await expect(page.locator("article", { hasText: "Tomato Egg Curry" })).toHaveCount(0);
  await page.getByLabel("Ready within").selectOption("15");
  await page.getByLabel("At least this match").selectOption("100");
  await expect(cards).toHaveCount(1);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByLabel("Almost achievable").check();
  await expect(cards).toHaveText(["Fried Rice"]);
  await page.getByLabel("Almost achievable").uncheck();

  // Recipe details and cooking mode.
  await page.getByRole("link", { name: /Tomato Egg Curry/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Tomato Egg Curry" })).toBeVisible();
  await expect(page.getByText("100% pantry match")).toBeVisible();
  await expect(page.getByText("5/5 have")).toBeVisible();
  await page.getByRole("button", { name: "Start cooking" }).click();
  await expect(page.getByRole("heading", { name: "Step 1 of 3" })).toBeVisible();
  await page.getByRole("button", { name: "Next step" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await page.getByRole("button", { name: "Finish cooking" }).click();
  await expect(page.getByRole("heading", { name: /Step \d of 3/ })).toHaveCount(0);

  // A missing ingredient shows its substitute on the details page.
  await page.goto("/recipes");
  await page.getByRole("link", { name: /Fried Rice/ }).click();
  await expect(page.getByText("Possible substitute: Oil.")).toBeVisible();

  // A normal user is refused by the admin API and sees no admin catalog.
  expect((await page.request.post("/api/v1/recipes", { data: {} })).status()).toBe(403);
  expect((await page.request.get("/api/v1/admin/catalog")).status()).toBe(403);
  expect((await page.request.delete("/api/v1/ingredients/1")).status()).toBe(403);
  expect((await page.request.post("/api/v1/cuisines", { data: { name: "Nope" } })).status()).toBe(403);
  await page.goto("/admin");
  await expect(page.getByText("Admin catalog unavailable")).toBeVisible();

  // Pantry survives; signed-in users skip the sign-in page; sign out ends the session.
  await page.goto("/login");
  await expect(page).toHaveURL(/\/pantry$/);
  await expect(page.locator("article h3")).toHaveCount(5);
  await page.getByRole("button", { name: /Sign out|Exit/ }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/v1/auth/me")).status()).toBe(401);
  // Guests can browse recipes without an account.
  expect((await page.request.get("/api/v1/recommendations")).status()).toBe(200);
  await page.goto("/recipes");
  await expect(page.getByRole("heading", { name: "CookMatch collection" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(page.locator("article").first()).toBeVisible();

  // No horizontal scrolling, and nothing blocked by the Content Security Policy.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors.filter((text) => /Content Security Policy|Refused to/i.test(text))).toEqual([]);
});
