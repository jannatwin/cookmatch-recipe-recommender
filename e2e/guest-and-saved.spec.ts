import { expect, test } from "@playwright/test";

test("guest journey: browse and open recipes without an account", async ({ page }) => {
  await page.goto("/recipes");
  await expect(page.getByRole("heading", { name: "CookMatch collection" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  // No pantry to compare against: match details and match filters are hidden.
  await expect(page.locator("article").first()).toBeVisible();
  await expect(page.getByText(/\d+% ?match/i)).toHaveCount(0);
  await expect(page.getByLabel("At least this match")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Search Spoonacular" })).toHaveCount(0);

  // Catalog filters still work for guests.
  await page.getByLabel("Cuisine").selectOption({ label: "Italian" });
  await expect(page.locator("article h2")).toHaveText(["Plain Omelette", "Garlic Butter Rice"]);
  await page.getByRole("button", { name: "Clear filters" }).first().click();

  await page.getByRole("link", { name: /Plain Omelette/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Plain Omelette" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in to check your pantry" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in to save this recipe" })).toBeVisible();
  await expect(page.getByText(/pantry match/)).toHaveCount(0);
  await page.getByRole("button", { name: "Start cooking" }).click();
  await expect(page.getByRole("heading", { name: "Step 1 of 2" })).toBeVisible();

  // The recipe is remembered in this browser only.
  await page.goto("/recipes");
  const recent = page.getByRole("region", { name: "Recently viewed" });
  await expect(recent.getByRole("link", { name: /Plain Omelette/ })).toBeVisible();

  // Personal areas and APIs still need an account.
  await page.goto("/saved");
  await expect(page).toHaveURL(/\/login\?next=%2Fsaved/);
  await page.goto("/pantry");
  await expect(page).toHaveURL(/\/login\?next=%2Fpantry/);
  expect((await page.request.get("/api/v1/favorites")).status()).toBe(401);
  expect((await page.request.put("/api/v1/favorites/1")).status()).toBe(401);
  expect((await page.request.get("/api/v1/pantry")).status()).toBe(401);
  expect((await page.request.get("/api/v1/ingredients")).status()).toBe(401);
});

test("saved recipes and pantry shortcuts: Tab completion, ingredient list, save and unsave", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByLabel("Your name").fill("E2E Saver");
  await page.getByLabel("Email address").fill(`e2e-saver-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/pantry$/);

  // Suggestions appear from the first letter and Tab completes the highlighted one.
  const input = page.getByLabel("Ingredients", { exact: true });
  await input.fill("t");
  await expect(page.getByRole("option", { name: /Tomato/ })).toBeVisible();
  await input.press("Tab");
  await expect(input).toHaveValue("Tomato, ");
  await expect(input).toBeFocused();

  // Picking from the ingredients list appends to the box; owned ingredients are ticked.
  await page.getByRole("button", { name: "Egg", exact: true }).click();
  await expect(input).toHaveValue("Tomato, Egg, ");
  await page.getByRole("button", { name: "Add to pantry" }).click();
  await expect(page.locator("p[role=status]").filter({ hasText: "Tomato, Egg added" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Egg \(in your pantry\)/ })).toBeDisabled();

  // Save a recipe, find it under Saved, then remove it.
  await page.goto("/recipes");
  await page.getByRole("link", { name: /Tomato Egg Curry/ }).click();
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/saved");
  await expect(page.locator("article h2")).toHaveText(["Tomato Egg Curry"]);
  await page.getByRole("link", { name: /Tomato Egg Curry/ }).click();
  await page.getByRole("button", { name: "Saved" }).click();
  await expect(page.getByRole("button", { name: "Save recipe" })).toBeVisible();
  await page.goto("/saved");
  await expect(page.getByRole("heading", { name: "No saved recipes yet" })).toBeVisible();
});
