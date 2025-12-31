# Retrograde

**A Time-Traveling Programming Education Platform**

Retrograde is an interactive web-based timeline that takes users on a journey through computing history, from early home computers of the late 1970s through the modern web era. Learn programming by understanding not just *what* a technology is, but *why* it emerged and what problem it solved.

## Features

- **Interactive Timeline**: Explore computing milestones chronologically from 1977 to present
- **Historical Context**: Each event includes detailed historical information and significance
- **Progress Tracking**: Your exploration progress is automatically saved in your browser
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **No Build Step**: Pure vanilla JavaScript—just open and run

## Getting Started

### Prerequisites

You'll need a local web server to run Retrograde due to browser security restrictions with ES modules and fetch API.

### Running Retrograde

**Option 1: Using Python** (if you have Python installed)

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Then open http://localhost:8000 in your browser.

**Option 2: Using Node.js** (if you have Node installed)

```bash
npx serve
```

**Option 3: Using PHP** (if you have PHP installed)

```bash
php -S localhost:8000
```

**Option 4: VS Code Live Server**

If you use VS Code, install the "Live Server" extension and click "Go Live" in the status bar.

## Project Structure

```
retrograde/
├── index.html              # Main entry point
├── css/                    # Stylesheets
│   ├── main.css           # Base styles
│   ├── timeline.css       # Timeline component styles
│   ├── event-card.css     # Event card styles
│   └── themes/retro.css   # Design system variables
├── js/                     # JavaScript modules
│   ├── app.js             # Main application coordinator
│   ├── utils.js           # Utility functions
│   ├── progress.js        # LocalStorage progress tracking
│   ├── events-loader.js   # Event data loader
│   ├── timeline.js        # Timeline renderer
│   └── router.js          # Hash-based routing
├── data/
│   └── events.json        # Master event registry
├── events/                 # Event content
│   ├── apple-ii/
│   ├── commodore-64/
│   ├── birth-of-the-web/
│   ├── html-dawn/
│   └── javascript-netscape/
└── assets/                 # Images, fonts, icons
```

## Adding a New Event

Adding a new historical event is simple:

1. **Create event folder** in `events/` directory:
   ```bash
   mkdir events/my-new-event
   mkdir events/my-new-event/lessons
   ```

2. **Create `meta.json`** with event metadata:
   ```json
   {
     "title": "My Event Title",
     "year": 1995,
     "month": 6,
     "category": "hardware",
     "summary": "A brief summary...",
     "significance": "Why it matters...",
     "keyFigures": ["Person 1", "Person 2"],
     "thumbnail": "thumbnail.svg",
     "tags": ["tag1", "tag2"]
   }
   ```

3. **Create `thumbnail.svg`** (100x100 viewBox):
   ```xml
   <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
     <!-- Your SVG content -->
   </svg>
   ```

4. **Create `content.md`** with historical context (Markdown format)

5. **Create `lessons/lessons.json`**:
   ```json
   {
     "lessons": [
       {
         "id": "intro",
         "title": "Introduction",
         "file": "01-intro.md",
         "type": "reading",
         "estimatedMinutes": 5
       }
     ]
   }
   ```

6. **Register event** in `data/events.json`:
   ```json
   {
     "events": [
       { "id": "my-new-event", "enabled": true }
     ]
   }
   ```

That's it! The new event will appear on the timeline automatically.

## Technologies Used

- **HTML5**: Semantic structure
- **CSS3**: Custom properties, flexbox, grid
- **Vanilla JavaScript (ES6+)**: No frameworks or build tools
- **Google Fonts**: VT323 and IBM Plex Mono for retro typography
- **LocalStorage API**: Client-side progress persistence

## Categories

Events are organized into categories:

- `hardware` - Physical computers and devices (cyan)
- `web` - Web technologies and protocols (orange)
- `language` - Programming languages (gold)
- `os` - Operating systems (purple)
- `tool` - Development tools and utilities (green)

## Browser Support

Retrograde works on all modern evergreen browsers:

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Internet Explorer is not supported.

## Progress Tracking

Your exploration progress is automatically saved in your browser's LocalStorage. This includes:

- Which events you've visited
- When you last explored the timeline

To reset your progress, open the browser console and run:

```javascript
Progress.reset()
```

## Current Events

Phase 1 includes these foundational computing milestones:

1. **Apple II** (1977) - The computer that brought programming to the masses
2. **Commodore 64** (1982) - The best-selling computer of all time
3. **Birth of the World Wide Web** (1991) - Tim Berners-Lee's revolution
4. **HTML & First Browsers** (1993) - Mosaic makes the web visual
5. **JavaScript is Born** (1995) - Brendan Eich creates JS in 10 days

## Future Phases

Phase 2 will add:
- Interactive lesson content
- Code editor component
- Terminal emulator
- Exercise validation

Phase 3 will include:
- Additional historical events
- Animations and transitions
- Search and filter capabilities
- Optional CRT theme toggle

## Contributing

This is a Phase 1 implementation. To contribute:

1. Follow the "Adding a New Event" guide above
2. Ensure events include accurate historical information
3. Keep summaries concise (1-2 sentences) and context detailed (2-3 paragraphs)
4. Use public domain or Creative Commons images/SVGs

## License

This project is provided as-is for educational purposes.

## Philosophy

> "The best way to learn programming is to understand the context in which technologies were created. Every programming language, every framework, every paradigm was someone's solution to a real problem at a specific moment in time."

Retrograde embraces simplicity in both its implementation and its approach. No build tools, no frameworks—just HTML, CSS, and JavaScript working together as they were meant to.
