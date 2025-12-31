# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Application

Retrograde requires a local HTTP server due to browser CORS restrictions with `fetch()` and the `file://` protocol.

```bash
# Start development server (Python 3)
python -m http.server 8000

# Then open http://localhost:8000
```

**CRITICAL**: The application will NOT work if you open `index.html` directly in the browser. It must be served over HTTP.

## Architecture Overview

Retrograde is a **pure vanilla JavaScript application** with zero build steps, no npm, and no frameworks. The entire codebase uses the **Global Object Pattern** for modules.

### Module Loading Order

Script loading order in `index.html` is critical and must be maintained:

1. `utils.js` - Base utilities (no dependencies)
2. `progress.js` - LocalStorage manager (depends on utils)
3. `events-loader.js` - JSON data fetcher (depends on utils)
4. `timeline.js` - Timeline renderer (depends on utils, events-loader)
5. `router.js` - Hash-based router (depends on utils)
6. `app.js` - Application coordinator (depends on all above)

**Never change this order** - modules are not ES modules and rely on global scope.

### Global Module Pattern

All JavaScript uses global objects (NOT ES6 modules):

```javascript
const ModuleName = {
  state: { /* internal state */ },
  init() { /* initialization */ },
  methodName() { /* methods */ }
}
```

This is intentional - no build step means no ES6 module support without additional complexity.

### Data Flow

1. **App Bootstrap** (`app.js`):
   - `DOMContentLoaded` → `App.init()`
   - Initializes Progress, Timeline, EventsLoader
   - Sets up Router with view handlers

2. **Event Loading** (`events-loader.js`):
   - Fetches `data/events.json` (master registry)
   - Loads each enabled event's `meta.json`
   - Sorts chronologically, stores in `EventsLoader.state.events`

3. **Timeline Rendering** (`timeline.js`):
   - Calculates year range dynamically from loaded events
   - Creates timeline containers: axis, track, event dots
   - Each event becomes a `.timeline-event-container` with:
     - Button (`.timeline-event-dot`) containing thumbnail
     - Label with year and title
     - Tooltip (hidden until hover)

4. **Routing** (`router.js`):
   - Hash-based: `#/timeline` or `#/event/:id`
   - No page reloads - toggles view visibility via `.active` class
   - Progress tracking happens on event view transitions

### View System

Two main views toggle via CSS class `.active`:

- `#view-timeline` - Timeline view (rendered by `Timeline.render()`)
- `#view-event-detail` - Event detail view (rendered by `App.renderEventDetail()`)

Only one view has `.active` class at a time.

## Adding New Events

Events are completely data-driven. No code changes needed to add events.

### Required Files

```
events/{event-id}/
├── meta.json           # Event metadata (REQUIRED)
├── thumbnail.svg       # Icon for timeline (REQUIRED)
├── content.md          # Historical context (optional, but recommended)
└── lessons/
    └── lessons.json    # Lesson manifest (REQUIRED but can be empty)
```

### Event Registration

After creating event files, register in `data/events.json`:

```json
{
  "events": [
    { "id": "event-id", "enabled": true }
  ]
}
```

Event ID must match folder name exactly.

### meta.json Schema

Required fields:
- `title` - Display name
- `year` - Year of event (used for timeline positioning)
- `category` - One of: `hardware`, `web`, `language`, `os`, `tool`
- `thumbnail` - Filename of thumbnail (e.g., "thumbnail.svg")
- `summary` - 1-2 sentence summary for timeline tooltip

Optional fields:
- `month` - Month (1-12, defaults to 1 if omitted)
- `significance` - Why this matters (longer paragraph)
- `keyFigures` - Array of people involved
- `tags` - Array of tags for future filtering

### Category Colors

Categories have specific color assignments in CSS:

- `hardware` → cyan (`--color-hardware`)
- `web` → orange (`--color-web`)
- `language` → gold (`--color-language`)
- `os` → purple (`--color-os`)
- `tool` → green (`--color-tool`)

These are defined in `css/themes/retro.css` and applied automatically via `.category-{name}` classes.

### Thumbnail Guidelines

- Format: SVG recommended (scales perfectly), PNG/JPG also supported
- ViewBox: `100 100` for SVG
- Size: 48px circular display on timeline (36px on mobile)
- Images are displayed inside circular `.timeline-event-dot` with `object-fit: contain`

## CSS Architecture

### Design System

All design tokens live in `css/themes/retro.css` as CSS custom properties:

- Colors: `--color-*`
- Typography: `--font-*`, `--font-size-*`
- Spacing: `--space-*`
- Layout: Container widths, component sizes
- Effects: Shadows, transitions, border radius

**Always use CSS variables** - never hardcode colors, sizes, or spacing.

### CSS File Structure

- `main.css` - Base styles, imports all others
- `themes/retro.css` - Design system variables only
- `timeline.css` - Timeline-specific components
- `event-card.css` - Card components (for future phases)

Import order in `main.css` matters: theme must load first.

### Responsive Breakpoints

Mobile-first approach:

```css
/* Default: < 640px (mobile) */
@media (min-width: 640px) { /* tablet */ }
@media (min-width: 1024px) { /* desktop */ }
```

## Progress Tracking

`Progress` module uses LocalStorage with key `retrograde_progress`:

```javascript
{
  events: {
    "event-id": {
      visited: true,
      lessonsCompleted: [],
      tabsViewed: [],
      completedAt: null
    }
  },
  lastVisited: "event-id",
  updatedAt: "ISO timestamp"
}
```

Progress is automatically saved on:
- Event view navigation
- Lesson completion (Phase 2)

Reset via browser console: `Progress.reset()`

## Timeline Year Calculation

**Year range is dynamic** - calculated from loaded events, NOT hardcoded:

```javascript
const years = events.map(e => e.year)
const minYear = Math.min(...years)
const maxYear = Math.max(...years)
```

Event positioning uses percentage: `Utils.yearToPosition(year, minYear, maxYear)` returns 0-100%.

Same-year events are clustered with vertical offset (`calculateVerticalOffset()`).

## Common Pitfalls

1. **Script order** - Changing script load order in `index.html` breaks the app
2. **CORS issues** - Must use HTTP server, not `file://` protocol
3. **Hash routing** - Browser back/forward works via `hashchange` event listener
4. **CSS imports** - `@import` order in `main.css` matters (theme first)
5. **LocalStorage** - Progress state persists between sessions; clear for testing
6. **Event IDs** - Must match folder names exactly (case-sensitive)

## Phase Status

**Phase 1 (Current)**: Timeline, routing, progress tracking, 5 historical events

**Phase 2 (Planned)**: Interactive lessons, code editor, terminal emulator, exercise validation

**Phase 3 (Planned)**: More events, search/filter, animations, optional CRT theme

When working on Phase 2/3 features, maintain the zero-build-step philosophy.
