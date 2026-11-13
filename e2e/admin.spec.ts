import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

test("admin journey: manage catalog, publish a recipe, see it recommended", async ({ page }) => {
  const stamp = Date.now();
  const email = `e2e-admin-${stamp}@example.com`;
  const ingredient = `E2E Paneer ${stamp}`;
  const renamed = `E2E Cheese ${stamp}`;
  const alias = `e2e ponir ${stamp}`;
  const recipe = `E2E Curry ${stamp}`;

  await page.goto("/register");
  await page.getByLabel("Your name").fill("E2E Admin");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/pantry$/);

  // Promote the account the way README describes: directly in the (local) database.
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
  const { data: me } = await (await page.request.get("/api/v1/auth/me"))
    .json()
    .then((body) => ({ data: body.user }));
  const { error } = await service.from("profiles").update({ role: "admin" }).eq("id", me.userId);
  expect(error).toBeNull();

  await page.goto("/admin");
  await page.getByRole("tab", { name: "Ingredients & substitutes" }).click();

  await page.getByLabel("Ingredient name").fill(ingredient);
  await page.getByLabel(/^Aliases/).fill(alias);
  await page.getByRole("button", { name: "Add ingredient" }).click();
  await expect(page.locator("p[role=status]")).toContainText("Ingredient and aliases added.");
  await page.getByLabel("Ingredient name").fill(ingredient);
  await page.getByRole("button", { name: "Add ingredient" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("already exists");
  await page.getByLabel("Ingredient name").fill("");

  page.once("dialog", (dialog) => void dialog.accept(renamed));
  await page.getByRole("button", { name: `Rename ${ingredient}` }).click();
  await expect(page.locator("p[role=status]")).toContainText("Ingredient renamed.");

  await page.getByLabel("Type").selectOption("cuisines");
  await page.getByLabel("Name", { exact: true }).fill(`E2E Cuisine ${stamp}`);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator("p[role=status]")).toContainText("Cuisine added.");

  await page.getByLabel("Ingredient to replace").selectOption({ label: renamed });
  await page.getByLabel("Possible substitute").selectOption({ label: "Butter" });
  await page.getByRole("button", { name: "Add substitute" }).click();
  await expect(page.locator("p[role=status]")).toContainText("Substitute mapping added.");

  // Draft first: not recommended, but the admin can preview it.
  await page.getByRole("tab", { name: "Recipes" }).click();
  await page.getByLabel("Recipe title").fill(recipe);
  await page.getByLabel("Cuisine").selectOption({ label: `E2E Cuisine ${stamp}` });
  await page.getByLabel("Search ingredients").fill("E2E Cheese");
  await page.getByLabel(renamed).check();
  await page.getByLabel("Step 1").fill("Cook it gently.");
  await page.getByRole("button", { name: "Create recipe" }).click();
  await expect(page.locator("p[role=status]")).toContainText("Recipe created.");
  const row = page.locator("li", { hasText: recipe });
  await expect(row).toContainText("Draft");
  await row.getByRole("link", { name: "Preview" }).click();
  await expect(page.getByRole("heading", { level: 1, name: recipe })).toBeVisible();

  await page.goto("/admin");
  await page.locator("li", { hasText: recipe }).getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Publish this recipe").check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator("p[role=status]")).toContainText("Recipe updated.");

  // The alias resolves to the renamed ingredient, and the new recipe is now a full match.
  await page.goto("/pantry");
  await page.getByLabel("Ingredients", { exact: true }).fill(alias);
  await page.getByRole("button", { name: "Add to pantry" }).click();
  await expect(page.locator("p[role=status]").filter({ hasText: `${renamed} added` })).toBeVisible();
  await page.goto("/recipes");
  await expect(page.locator("article", { hasText: recipe })).toContainText("100%");

  // An ingredient in use cannot be deleted; after the recipe goes, it can.
  await page.goto("/admin");
  await page.getByRole("tab", { name: "Ingredients & substitutes" }).click();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: `Delete ${renamed}` }).click();
  await expect(page.locator("p[role=alert]")).toContainText("used by a recipe");
  await page.getByRole("button", { name: `Remove alias ${alias}` }).click();
  await expect(page.locator("p[role=status]")).toContainText("removed.");

  await page.getByRole("tab", { name: "Recipes" }).click();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.locator("li", { hasText: recipe }).getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("p[role=status]")).toContainText("was deleted.");
  await page.getByRole("tab", { name: "Ingredients & substitutes" }).click();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: `Delete ${renamed}` }).click();
  await expect(page.locator("p[role=status]")).toContainText("was deleted.");
  await expect(page.getByRole("button", { name: `Delete ${renamed}` })).toHaveCount(0);
});
