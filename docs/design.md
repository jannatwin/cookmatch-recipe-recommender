# CookMatch: Tailwind CSS Design System

This document describes the visual and interaction design for the CookMatch Next.js application. Implement styles with **Tailwind CSS utility classes and theme tokens**. Do not introduce a separate plain-CSS component styling system. Small global CSS is acceptable only for Tailwind entry points, font registration, and truly global browser behavior that utilities cannot express.

## 1. Concept

CookMatch should feel like a friendly kitchen made of soft modeling clay: rounded pastel surfaces, gentle depth and clear, touchable controls.

- Ingredients are small clay pebbles (chips).
- Recipes are rounded clay cards.
- Buttons look pressable and visibly respond to interaction.
- Design mobile-first, then expand to tablet and desktop.

## 2. Theme tokens

Use these colors consistently. Text contrast and control boundaries take priority over visual softness.

| Token | Purpose | Hex |
| --- | --- | --- |
| `cream` | Page background | `#FFF4E8` |
| `coral` | Primary action and active state | `#FF8A70` |
| `peach` | Card surface | `#FFD3B8` |
| `mint` | High match and pantry-have state | `#BFE8D2` |
| `butter` | Almost-achievable and expiring state | `#FFE7A3` |
| `lavender` | Substitute and informational state | `#D9CCF5` |
| `cocoa` | Primary text | `#4A3328` |

Register the palette in the Tailwind theme, using the syntax supported by the project's installed Tailwind version. For Tailwind v4, prefer `@theme` tokens in the Tailwind entry stylesheet; for v3, use `theme.extend.colors` in `tailwind.config.ts`. This configuration is not permission to write component styles in standalone CSS.

Example utility usage:

```tsx
<main className="min-h-screen bg-cream text-cocoa">
  <section className="rounded-[2rem] bg-peach p-6 shadow-clay">
    <button className="rounded-full bg-coral px-7 py-3 font-bold text-cocoa shadow-clay hover:brightness-105 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-cocoa">
      Find recipes
    </button>
  </section>
</main>
```

`shadow-clay` above is a named Tailwind theme utility. Define reusable theme utilities with the installed Tailwind version's supported plugin/theme mechanism. If a one-off shadow is needed, use Tailwind arbitrary-value syntax. Avoid repeating long arbitrary values in many components; extract a React component or named utility.

## 3. Clay surfaces and interaction

Use rounded corners and layered, soft shadows to suggest depth. Keep shadows subtle enough that text and controls remain clear on low-brightness displays. Use pressed/hover/focus states with Tailwind state variants (`active:`, `hover:`, `focus-visible:`); avoid custom CSS selectors for component behavior.

Prefer reusable components such as `Button`, `IngredientChip`, `RecipeCard`, `MatchBadge`, `FilterChip` and `Input`. Put class composition in those components so the design stays consistent.

## 4. Typography and spacing

| Use | Style |
| --- | --- |
| Headings | Rounded display font such as Baloo 2 or Fredoka; 24–32 px |
| Body | Nunito or a readable system sans; 16 px with generous line height |
| Recipe titles | Display font; 22–24 px |
| Labels and chips | Body font, medium weight; at least 14 px |
| Spacing | 8, 16, 24 and 32 px rhythm |
| Corners | Cards 32–36 px; chips/buttons fully rounded |

Load fonts with `next/font` where possible. Use responsive Tailwind breakpoints for layout and type scaling.

## 5. Components

| Component | Design and behavior |
| --- | --- |
| Buttons | Pill shape, coral primary fill, distinct hover/active/focus states; disabled state remains readable |
| Ingredient chips | Mint/peach surfaces; remove button has an accessible name. Expiring items use butter plus a clock icon and text |
| Ingredient input | Inset-looking rounded field; suggestions appear in a keyboard-navigable listbox |
| Recipe card | Rounded surface, image when permitted, title, time, cuisine, score badge and missing ingredient summary |
| Match badge | Shows numeric percentage and a text label; color is never the only signal |
| Missing ingredient | Coral chip with a clear substitute disclosure/action where available |
| Filters | Responsive toggle/select controls for cuisine, time and diet; combined filters preserve ranking |
| Navigation | Bottom navigation on mobile and a clear top/side navigation on larger screens |

## 6. Screens

1. **Register / Log in:** centered accessible form card with clear labels, errors and recovery links when enabled.
2. **Pantry:** searchable ingredient input, selected ingredient chips, expiry-date control and a prominent recommendation action.
3. **Recommendations:** responsive filters and ranked recipe cards; clearly show score, have/missing items, expiry and near-match status.
4. **Recipe detail:** image when allowed, complete ingredient list with pantry state, substitutes, ordered instructions and a start-cooking interaction.
5. **Admin:** usable CRUD forms and tables for recipes, ingredients, aliases and substitutes.

## 7. Responsive layout and motion

- Page side padding: 16 px on mobile and 32 px on desktop.
- Cards use a single column on small screens and a grid when sufficient width is available.
- Touch targets are at least 44 by 44 px.
- Use Tailwind transitions sparingly. Respect reduced motion through supported `motion-reduce:` variants; do not require a custom animation stylesheet.
- Keep mobile navigation reachable without covering important content.

## 8. Accessibility

- Use semantic HTML, associated labels, visible keyboard focus and logical heading order.
- Keep text contrast at WCAG AA levels; test actual combinations rather than assuming pastel colors pass.
- Never communicate match status by color alone; include the percentage and labels such as “missing 1”.
- Autocomplete must support keyboard navigation and announce suggestions/results.
- Give icon-only controls accessible names; do not use emoji as the only label.
- Respect reduced motion and avoid interaction that depends on hover alone.

## 9. Do and avoid

| Do | Avoid |
| --- | --- |
| Use the documented Tailwind tokens and reusable components | Add a parallel component CSS framework |
| Keep surfaces soft but readable | Use weak contrast or invisible borders |
| Leave enough space for shadows and touch | Crowd cards together |
| Pair color with text and icons | Rely on color alone |
| Keep motion short and optional | Add long or distracting animation |

## 10. Related documents

See `implementation.md` for the selected stack, `CookMatch Software Requirements Specification.md` for the required screens and behaviors, and `README.md` for setup.
