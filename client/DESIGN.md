# MarketPulse design

Terminal dark: a market-data screen that stays calm. Near-black surfaces, numbers in a monospaced face, one electric-blue accent for data and actions.

## Tokens (`src/styles.scss`, mapped in `tailwind.config.js`)

| Token | Value | Use |
| --- | --- | --- |
| `bg` | `#090A0C` | Page |
| `surface` | `#101216` | Panels |
| `raised` | `#181B20` | Hover rows, tooltips, skeletons |
| `line` | `#E6E9EE` at 6 to 14% | Borders, grid lines |
| `ink` | `#E6E9EE` | Main text |
| `ink-muted` | `#98A0AB` | Secondary text |
| `ink-faint` | `#626A75` | Labels, hints, axis text |
| `accent` | `#4D8DFF` | Bars, lines, primary button, selected chips |
| `up` / `down` | `#3DD68C` / `#FF6B6B` | Year-over-year change and errors only, always with ▲ ▼ or an icon |

Type: Inter Variable for text; JetBrains Mono Variable (`.num`) for every number so columns line up. Section titles are small uppercase labels.

## Charts

All charts use the single accent hue (validated: it passes lightness, chroma and 3:1 contrast on the `#101216` surface). Identity is carried by text labels, never by colour, so comparisons of several skills or countries are rows with names instead of coloured series.

- **Bar list**: label, bar, value. Rounded data end, track behind the bar.
- **Histogram**: bars with 2px gaps and rounded tops; the middle 50% is full accent, the rest a lighter step; a dashed median line with its value.
- **Line**: 2px line with a faint area, crosshair and tooltip on hover, axis text in HTML so it never stretches.
- **Range plot**: thin line for the 10th–90th percentile, bar for the middle 50%, white tick for the median, all on one shared scale.
- Histogram and salary history have a Table toggle; every chart has a text label for screen readers.

## Layout

- Desktop: search bar across the top (skill, location, country), 224px section nav on the left, content up to 1360px.
- Mobile: search bar on two lines, scrolling section tabs, single-column panels, job filters folded behind a Filters button.
- The search is in the URL (`?c=fr&q=.NET&l=Lyon`) and remembered between visits.
