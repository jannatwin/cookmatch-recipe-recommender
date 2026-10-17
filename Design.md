# CookMatch: Claymorphism Design

UI design guide for CookMatch, a recipe recommendation system based on available ingredients.

## 1. Concept

CookMatch should feel like a kitchen made of soft modeling clay: puffy, rounded, pastel and friendly. Every element looks like a squishy 3D object sitting on a warm cream surface.

- Ingredients are small clay pebbles.
- Recipes are plump clay cards.
- Buttons look like they can be pressed.

## 2. Colors

| Role | Color | Hex |
| --- | --- | --- |
| Background | Warm cream | `#FFF4E8` |
| Primary (buttons, active tab) | Tomato coral | `#FF8A70` |
| Card base | Peach | `#FFD3B8` |
| High match (80% and above) | Mint | `#BFE8D2` |
| Almost-achievable (1 to 2 missing) | Butter yellow | `#FFE7A3` |
| Substitute / info | Lavender | `#D9CCF5` |
| Text | Cocoa brown | `#4A3328` |

Never use pure black or pure white. Use cocoa for text and cream-white for highlights.

### CSS variables

```css
:root {
  --bg: #FFF4E8;
  --primary: #FF8A70;
  --card: #FFD3B8;
  --match-high: #BFE8D2;
  --match-almost: #FFE7A3;
  --info: #D9CCF5;
  --text: #4A3328;

  --shadow-dark: rgba(150, 90, 60, 0.25);
  --shadow-light: rgba(255, 255, 255, 0.7);
}
```

## 3. The Clay Effect

The look comes from three shadows layered on one shape: a soft outer shadow, a light inner highlight at the top-left, and a darker inner shade at the bottom-right.

```css
.clay {
  border-radius: 32px;
  background: var(--card);
  box-shadow:
    12px 12px 24px var(--shadow-dark),              /* outer drop shadow */
    inset 8px 8px 16px var(--shadow-light),         /* top-left highlight */
    inset -8px -8px 16px var(--shadow-dark);        /* bottom-right shade */
}

.clay:active {
  box-shadow:
    4px 4px 8px var(--shadow-dark),
    inset 6px 6px 12px rgba(150, 90, 60, 0.3);      /* pressed-in look */
  transform: scale(0.97);
}
```

Use the same recipe on every component. Only the base color and the radius change.

## 4. Typography

| Use | Font | Size |
| --- | --- | --- |
| Headings | Baloo 2 or Fredoka (rounded, bold) | 24 to 32 px |
| Body | Nunito | 16 px, generous line height |
| Recipe titles | Baloo 2 or Fredoka | 22 to 24 px |
| Labels and chips | Nunito, medium weight | 14 px |

Rounded fonts match the puffy shapes.

## 5. Components

| Component | Design |
| --- | --- |
| Buttons | Pill shape (radius 999 px), coral fill, cream text. The pressed state sinks inward |
| Ingredient chips | Small mint or peach clay pebbles with a tiny "x" to remove. An expiring ingredient gets a butter-yellow tint and a small clock icon |
| Input field | Inset (carved-in) clay bar with the shadows reversed, so it looks pressed into the surface. Suggestions drop down as a stack of small clay tiles |
| Recipe card | Radius 36 px, round food image at the top with a clay border, title, cooking time and cuisine tag. A circular match-score badge sits at the top-right corner |
| Match-score badge | Clay ring with the percentage in the center. Mint for 80% and above, yellow for almost-achievable, peach for lower scores |
| Missing ingredient tag | Small coral pebble. Tapping it opens a lavender clay bubble showing the substitute |
| Filters | Row of toggle pills for cuisine, time and diet. Selected pills are pressed in and turn coral |
| Navigation | Floating clay bar at the bottom on mobile (Home, Pantry, Recipes, Profile). Floating clay sidebar on desktop |

### Inset input example

```css
.clay-input {
  border-radius: 24px;
  background: #FFE9D6;
  border: none;
  padding: 14px 20px;
  color: var(--text);
  box-shadow:
    inset 6px 6px 12px var(--shadow-dark),
    inset -6px -6px 12px var(--shadow-light);
}
```

### Button example

```css
.clay-button {
  border-radius: 999px;
  background: var(--primary);
  color: #FFF4E8;
  padding: 14px 28px;
  font-weight: 700;
  border: none;
  box-shadow:
    10px 10px 20px var(--shadow-dark),
    inset 6px 6px 12px rgba(255, 255, 255, 0.5),
    inset -6px -6px 12px rgba(150, 60, 40, 0.3);
}
```

## 6. Screens

1. **Register / Log in:** one large clay card centered on cream, with two carved-in inputs, a coral "Log in" pill, and a floating clay pot illustration above it.
2. **Enter ingredients:** a big carved search bar at the top, a growing cloud of ingredient pebbles below, and a coral "Find recipes" button fixed at the bottom.
3. **Recommendations:** filter pills at the top, then a vertical list of recipe cards sorted by match score. An "Almost there" section in yellow follows the main list.
4. **Recipe details:** a large round image, an ingredient list with have (mint) and missing (coral) pebbles, numbered steps on clay tiles, and a big "Start cooking" pill at the bottom.

## 7. Spacing and Shape

| Item | Value |
| --- | --- |
| Spacing scale | 8, 16, 24, 32 px |
| Card radius | 32 to 36 px |
| Chip radius | 999 px (fully round) |
| Page side padding | 16 px on mobile, 32 px on desktop |
| Gap between cards | 20 to 24 px, so the outer shadows do not overlap |

## 8. Motion

- Cards and chips slide in with a soft bounce (spring easing, about 300 ms).
- Pressing a button squishes it to 97% scale, then springs back.
- Adding an ingredient makes its pebble "pop" in with a slight overshoot.
- The match-score ring fills smoothly from 0 to its value.
- Respect the reduced-motion setting by turning these off.

```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

## 9. Accessibility

- Keep cocoa text on every clay surface; it passes the 4.5:1 contrast ratio on all the colors above.
- Never use color alone for match status. Always show the percentage and a label such as "missing 1" next to the color.
- Keep touch targets at least 44 px tall.
- Give focus states a clear 3 px coral outline.
- Soft shadows can look weak on some screens, so check the cards against the cream background on a low-brightness display.

## 10. Do and Don't

| Do | Don't |
| --- | --- |
| Use the same shadow recipe everywhere | Mix flat and clay styles on one screen |
| Keep shapes round and chunky | Use sharp corners or thin lines |
| Use soft pastel colors with cocoa text | Use pure black, pure white or neon colors |
| Leave generous space between elements | Crowd cards so the shadows overlap |
| Show match status with text and color | Rely on color alone |
| Keep animations short and gentle | Add long or flashy animations |

## 11. Related Documents

| Document | Contents |
| --- | --- |
| `README.md` | Project overview and setup |
| `cookmatch_architecture_and_database.md` | Architecture and database design |
| `api.md` | API reference used by the screens |
