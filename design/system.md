# FinTec design system (synced)

Synced from the project sources. Values are copied, not invented. Colors are HSL triplets as declared (`hsl(var(--token))`).

Sources: `app/globals.css` (`:root`, `.dark`), `tailwind.config.ts` (`theme.extend`).

## Colors — light (`:root`, app/globals.css)

| Token | Value | Usage |
| --- | --- | --- |
| `--background` | `240 5% 96%` | App background (system grayish) |
| `--foreground` | `0 0% 0%` | Primary text |
| `--card` | `0 0% 100%` | Cards, sheets |
| `--popover` | `0 0% 100%` | Popovers |
| `--primary` | `211 100% 42%` | iOS blue, AA with white (5.31:1); primary actions |
| `--primary-foreground` | `0 0% 100%` | Text on primary |
| `--secondary` | `0 0% 92%` | System gray 6; secondary fills, user bubbles alt |
| `--muted` | `0 0% 85%` | System gray 5 |
| `--muted-foreground` | `0 0% 40%` | Secondary text |
| `--accent` | `211 100% 42%` | Accent (same as primary) |
| `--destructive` | `0 84% 60%` | Destructive actions |
| `--border` | `0 0% 80%` | Separators |
| `--input` | `0 0% 100%` | Inputs |
| `--ring` | `211 100% 50%` | Focus ring |
| `--success` | `142 70% 45%` | iOS green; income, confirmed |
| `--error` | `354 84% 60%` | iOS red; expense, errors |
| `--warning` | `38 92% 50%` | iOS orange; needs attention |
| `--info` | `211 100% 50%` | iOS blue; info |

## Colors — dark (`.dark`, app/globals.css)

| Token | Value |
| --- | --- |
| `--background` | `0 0% 0%` |
| `--foreground` | `0 0% 98%` |
| `--card` | `0 0% 9%` |
| `--popover` | `0 0% 12%` |
| `--primary` | `211 100% 65%` (foreground `0 0% 0%`) |
| `--secondary` | `0 0% 16%` |
| `--muted` | `0 0% 12%` (foreground `0 0% 65%`) |
| `--destructive` | `0 75% 70%` |
| `--border` | `0 0% 18%` |
| `--input` | `0 0% 12%` |
| `--ring` | `211 100% 65%` |
| `--success` | `142 70% 60%` |
| `--error` | `354 75% 70%` |
| `--warning` | `38 90% 65%` |

## Typography (tailwind.config.ts)

- Families: `sans` = Inter, system-ui, sans-serif; `mono` = JetBrains Mono, Menlo, Monaco, monospace. Artboards use the system fallback (`system-ui`) since they cannot load fonts.
- Scale (`fontSize`): `ios-large-title` 2rem / 1.2 / -0.01em; `ios-title` 1.5rem / 1.25 / -0.01em; `ios-headline` 1.125rem / 1.3 / -0.005em; `ios-body` 1rem / 1.5; `ios-caption` 0.875rem / 1.4; `ios-footnote` 0.75rem / 1.35.

## Radius, shadows, motion

- Radius: `--radius` 0.75rem (app/globals.css).
- Shadows (tailwind.config.ts): `soft` `0 2px 15px -3px rgba(0,0,0,.07), 0 10px 20px -2px rgba(0,0,0,.04)`; `medium` `0 4px 25px -5px rgba(0,0,0,.1), 0 10px 10px -5px rgba(0,0,0,.04)`; `ios-sm` `0 4px 12px rgba(0,0,0,.22)`; `ios-md` `0 10px 24px rgba(0,0,0,.28)`; `ios-lg` `0 18px 40px rgba(0,0,0,.35)`.
- Motion (app/globals.css): micro 120ms, popover 180ms, sheet 320ms; ease standard `cubic-bezier(0.4,0,0.2,1)`, sheet `cubic-bezier(0.32,0.72,0,1)`.
- Layout (app/globals.css): `--mobile-nav-height` 68px, safe-area insets.

## Component rules

- Money colors: income `--success`, expense `--error`, transfer `--primary`; pending/needs-input `--warning`.
- Focus: visible ring in `--ring`.
- Cards: `--card` on `--background`, radius `--radius`, shadow `soft`.
