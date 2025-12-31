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
4. **BASIC Environment Modules** (depends on utils):
   - `environments/basic-screen.js` - Terminal emulator (40x24 display)
   - `environments/basic-tokenizer.js` - Lexical analysis
   - `environments/basic-parser.js` - AST generation
   - `environments/basic-interpreter.js` - Execution engine
   - `environments/apple-ii-environment.js` - Environment orchestrator
5. **Tutorial Modules** (depends on utils, progress):
   - `tutorial/tutorial-validator.js` - Output capture and validation
   - `tutorial/tutorial-engine.js` - State machine and navigation
   - `tutorial/tutorial-renderer.js` - UI rendering
6. `timeline.js` - Timeline renderer (depends on utils, events-loader, progress)
7. `router.js` - Hash-based router (depends on utils)
8. `app.js` - Application coordinator (depends on all above)

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

## Tutorial System

The tutorial system provides interactive, graded lessons for learning programming concepts. Each event can optionally enable a Tutorial tab with custom lessons.

### Architecture

**Three-Module System**:

1. **TutorialEngine** (`tutorial-engine.js`) - State machine
   - Loads lesson data from `events/{event-id}/tutorials.json`
   - Manages current lesson index and navigation
   - Tracks completion status per lesson
   - Syncs progress with `Progress` module (LocalStorage)
   - Enforces linear progression (lessons unlock sequentially)

2. **TutorialValidator** (`tutorial-validator.js`) - Output validation
   - Intercepts BASIC interpreter output by wrapping callbacks
   - Captures output during code execution
   - Compares actual output against expected patterns
   - Supports case-insensitive and partial matching
   - Custom validation for complex exercises (e.g., calculator)

3. **TutorialRenderer** (`tutorial-renderer.js`) - UI rendering
   - Renders lesson content (title, objective, explanation, examples)
   - Creates isolated mini BASIC terminal per exercise
   - Handles navigation (previous/next, lesson dots)
   - Shows progressive hints
   - Displays success/failure feedback with animations

### Tutorial Data Structure

Lessons are defined in `events/{event-id}/tutorials.json`:

```json
{
  "version": "1.0",
  "eventId": "event-id",
  "totalLessons": 6,
  "lessons": [
    {
      "id": "lesson-1",
      "order": 1,
      "title": "Lesson Title",
      "objective": "What the user will learn",
      "concepts": ["concept1", "concept2"],
      "content": {
        "introduction": "Opening paragraph",
        "explanation": "Detailed explanation",
        "syntax": "CODE SYNTAX",
        "examples": [
          {
            "code": "EXAMPLE CODE",
            "output": "EXPECTED OUTPUT",
            "description": "What this shows"
          }
        ],
        "tips": ["Tip 1", "Tip 2"]
      },
      "exercise": {
        "prompt": "Exercise instructions",
        "instructions": ["Step 1", "Step 2"],
        "validation": {
          "type": "output",
          "expectedOutput": ["LINE 1", "LINE 2"],
          "caseSensitive": false,
          "partialMatch": false
        },
        "hints": ["Hint 1", "Hint 2", "Hint 3"]
      }
    }
  ]
}
```

### Validation Types

**Output-based validation** (default):
- `expectedOutput`: Array of strings to match
- `caseSensitive`: true/false (default: true)
- `partialMatch`: true for substring matching, false for exact line match
- `customCheck`: Special validation logic (e.g., "sum" for calculator)

### Progress Tracking

Tutorial progress is tracked at the lesson level:

```javascript
Progress.getEventProgress(eventId)
// Returns:
{
  visited: true,
  lessonsCompleted: ["lesson-1", "lesson-2"],  // Array of completed lesson IDs
  tabsViewed: [],
  completedAt: null
}

// Helper methods:
Progress.markLessonCompleted(eventId, lessonId)
Progress.isLessonCompleted(eventId, lessonId)
Progress.getTutorialCompletion(eventId, totalLessons)  // Returns 0-100%
```

### Timeline Progress Rings

Events with tutorials show a progress ring on the timeline dot:

- **0% complete**: No ring (normal dot)
- **1-99% complete**: Partial SVG ring showing progress
- **100% complete**: Standard "visited" checkmark

The ring is created in `timeline.js` via `createProgressRing(percentage)` and updates dynamically as lessons are completed.

### Tab Integration

Tutorial tab is conditionally enabled in `app.js`:

```javascript
// In renderEventDetail():
<button class="tab-btn ${event.tutorial?.enabled ? '' : 'disabled'}"
        data-tab="tutorial">Tutorial</button>

// In attachTabHandlers():
if (tab.dataset.tab === 'tutorial' && !this.tutorialInitialized) {
  this.tutorialInitialized = true
  await this.initializeTutorial()
}
```

The tab only appears enabled if `event.tutorial.enabled` is true in meta.json.

## Environment System (Interactive Playgrounds)

The environment system provides interactive code execution environments. Currently implemented: **Apple II BASIC**.

### Apple II BASIC Interpreter

A complete Applesoft BASIC interpreter built in pure JavaScript (no external emulators).

#### Architecture (5 Modules)

1. **BasicScreen** (`basic-screen.js`) - Terminal emulator
   - 40x24 character buffer (authentic Apple II dimensions)
   - Cursor positioning and blinking animation
   - Keyboard input handling
   - Methods: `print()`, `println()`, `clear()`, `getInput()`, `showPrompt()`

2. **BasicTokenizer** (`basic-tokenizer.js`) - Lexical analysis
   - Converts source code to tokens
   - Token types: NUMBER, STRING, KEYWORD, IDENTIFIER, OPERATOR, PUNCTUATION
   - Recognizes 20+ BASIC keywords (PRINT, LET, INPUT, IF, FOR, etc.)

3. **BasicParser** (`basic-parser.js`) - Syntax analysis
   - Converts tokens to Abstract Syntax Tree (AST)
   - Operator precedence parsing (comparison → addition → multiplication)
   - Statement parsers for each BASIC command
   - Handles line numbers for program mode vs immediate mode

4. **BasicInterpreter** (`basic-interpreter.js`) - Execution engine
   - Program storage: `Map<lineNumber, {source, ast}>`
   - Variable storage: `{ name: value }` ($ suffix = string variables)
   - FOR loop stack for nested loops
   - Executes AST nodes recursively
   - Supports immediate mode (run now) and program mode (store, then RUN)

5. **AppleIIEnvironment** (`apple-ii-environment.js`) - Orchestrator
   - Renders CRT monitor UI (bezel + screen)
   - Initializes screen and interpreter
   - Starts REPL (Read-Eval-Print Loop)
   - Handles reset button

#### Supported BASIC Commands

| Command | Syntax | Description |
|---------|--------|-------------|
| PRINT | `PRINT expr [; expr]...` | Display text or numbers |
| LET | `[LET] var = expr` | Assign value to variable |
| INPUT | `INPUT ["prompt";] var` | Get user input |
| IF/THEN | `IF cond THEN statement` | Conditional execution |
| GOTO | `GOTO linenum` | Jump to line |
| FOR | `FOR var = start TO end [STEP n]` | Start loop |
| NEXT | `NEXT var` | End loop |
| REM | `REM comment` | Comment |
| END | `END` | Stop program |
| LIST | `LIST [start[-end]]` | Show program |
| RUN | `RUN` | Execute program |
| NEW | `NEW` | Clear program |
| HOME | `HOME` | Clear screen |

#### Error Messages

Authentic Applesoft error format:
- `?SYNTAX ERROR`
- `?UNDEF'D STATEMENT ERROR`
- `?TYPE MISMATCH ERROR`
- `?NEXT WITHOUT FOR ERROR`
- `?DIVISION BY ZERO ERROR`

#### CSS Styling

CRT screen effect in `css/environments/apple-ii-basic.css`:
- Green phosphor text (#33FF33) on black background (#0A0A0A)
- Scanlines overlay (very subtle)
- Text glow effect (box-shadow)
- Blinking cursor animation
- Monitor bezel with gradients and shadows

### Adding New Environments

To add a new interactive environment (e.g., C64 BASIC, Python REPL):

1. Create `js/environments/{env-name}-environment.js` with:
   - `init(container)` - Setup and render
   - `destroy()` - Cleanup
   - REPL or execution loop

2. Add environment modules to `index.html` (maintain load order)

3. Update `app.js` `initializeEnvironment()`:
   ```javascript
   if (event.environment.type === 'your-env-type') {
     await YourEnvironment.init(container)
   }
   ```

4. Add `environment` field to event meta.json:
   ```json
   {
     "environment": {
       "type": "your-env-type",
       "enabled": true
     }
   }
   ```

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
- `tutorial` - Tutorial configuration (enables Tutorial tab):
  ```json
  {
    "enabled": true,
    "lessonCount": 6
  }
  ```
  Requires corresponding `tutorials.json` file in event folder.

- `environment` - Interactive playground configuration (enables Playground tab):
  ```json
  {
    "type": "apple-ii-basic",
    "enabled": true
  }
  ```
  Type must match an implemented environment in `js/environments/`.

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
- `tutorial.css` - Tutorial system styles (lessons, exercises, navigation)
- `environments/apple-ii-basic.css` - Apple II BASIC terminal styles

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

**Phase 1 (✅ Complete)**:
- Timeline with year-based positioning and clustering
- Hash-based routing (#/timeline, #/event/:id)
- LocalStorage progress tracking
- 5 historical events with metadata
- Responsive design (mobile, tablet, desktop)

**Phase 2 (✅ Complete)**:
- ✅ Interactive tutorial system with graded exercises
- ✅ Apple II BASIC interpreter (tokenizer → parser → interpreter)
- ✅ Terminal emulator (40x24 display, keyboard input)
- ✅ Output-based exercise validation
- ✅ Progress tracking with timeline progress rings
- ✅ 6 progressive BASIC lessons (Hello World → Complete Program)
- ✅ Linear lesson progression with hints and feedback

**Phase 3 (Future)**:
- More historical events (C64, Web, JavaScript, etc.)
- Additional interactive environments (C64 BASIC, Python, JavaScript)
- More tutorial lessons for existing events
- Search and filter functionality
- Enhanced animations and transitions
- Optional CRT scan-line theme
- Achievement system

When working on Phase 3 features, maintain the zero-build-step philosophy.

## Current Feature Set

**✅ Implemented:**
- Timeline visualization with dynamic year range
- Event detail pages with History/Tutorial/Playground tabs
- Apple II BASIC interpreter (complete Applesoft implementation)
- Tutorial system with 6 lessons
- Output validation for exercises
- Progress tracking (visited events, completed lessons)
- Timeline progress rings showing tutorial completion
- Responsive design
- LocalStorage persistence

**🔜 Next Steps:**
- Add tutorials for other events
- Implement additional historical events
- Add more BASIC commands (GOSUB/RETURN, arrays, functions)
- Consider C64 BASIC environment
- Add search/filter for events
