# Pi-splay

Pi-splay is a touch-friendly modular dashboard built with HTML, TypeScript, Tailwind CSS, and SASS. It features customizable tiles that can be rearranged and edited, with a focus on time tracking and development tools.

## Features

- **Modular Tile System**: Drag-and-drop tiles that can be rearranged on the dashboard
- **Time Modules**: Display time in 24-hour format (HH:MM:SS) for both local and UTC timezones
- **Time Marking**: Tap any time module to record the exact moment with epoch timestamp and millisecond precision
- **Touch-Friendly**: Optimized for touch devices with responsive design
- **Responsive Layout**: Works seamlessly on both large and small screens
- **Flexible Tile Sizing**: Three size options (small=500px, medium=1000px, large=1500px)

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pi-splay
```

2. Install dependencies:
```bash
npm install
```

## Build

Build the project for production:

```bash
npm run build
```

This command will:
- Compile SASS to CSS and process with Tailwind CSS
- Bundle TypeScript to a single JavaScript file (using esbuild)
- Output static files to the `dist/` directory

The build produces static files that can be served without a build step:
- `dist/styles.css` - Compiled and minified CSS
- `dist/main.js` - Bundled and minified JavaScript (all dependencies included)

### Build Options

- `npm run build` - Full build (CSS + JavaScript bundle)
- `npm run build:css` - Build only CSS (SASS + Tailwind)
- `npm run build:js` - Build only JavaScript bundle
- `npm run build:ts` - Type-check TypeScript (doesn't create bundle)

## Development

Run in development mode with file watching:

```bash
npm run dev
```

This will:
- Watch for changes in TypeScript files and rebuild the JavaScript bundle
- Watch for changes in SASS files and rebuild CSS
- Automatically update when you make changes

### Watch Options

- `npm run dev` - Watch both CSS and JavaScript
- `npm run watch:css` - Watch only CSS files
- `npm run watch:js` - Watch only JavaScript files (rebundles on changes)
- `npm run watch:ts` - Type-check TypeScript only (doesn't create bundle)

## Running

After building, the dashboard can be run in two ways:

### Static Files (Production)

The build produces static files that work without a server. Simply open `index.html` in a web browser:

```bash
# After building
open index.html  # macOS
# or double-click index.html in your file manager
```

All JavaScript is bundled into a single file, so no build step or server is required at runtime.

### Using a Local Server (Development)

For development, you can use a local web server:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Configuration

### Default Tiles

By default, the dashboard initializes with two time modules:
- **Local Time**: Displays the current local time
- **UTC Time**: Displays the current UTC time

### Tile Configuration

Tiles are configured in `src/main.ts`. Each tile has the following structure:

```typescript
{
  id: string,           // Unique identifier
  type: 'time',         // Tile type (currently only 'time')
  size: 's' | 'm' | 'l', // Tile size (small, medium, large)
  data: {
    timezone: 'local' | 'utc',  // Timezone for time display
    marks: TimeMark[]           // Array of time marks (max 4)
  }
}
```

### Adding Custom Tiles

To add more tiles, modify the `defaultTiles` array in `src/main.ts`:

```typescript
const defaultTiles: Tile[] = [
  {
    id: generateId(),
    type: 'time',
    size: 's',
    data: {
      timezone: 'local',
      marks: []
    }
  },
  // Add more tiles here...
];
```

### Tile Sizes

- **Small (s)**: 500px wide (1x)
- **Medium (m)**: 1000px wide (2x)
- **Large (l)**: 1500px wide (3x)

On smaller screens (< 1024px), medium and large tiles will automatically resize to fit the viewport.

## Usage

### Time Modules

- **Viewing Time**: Time modules display the current time in 24-hour format (HH:MM:SS)
- **Creating Marks**: Tap anywhere on a time module to create a mark showing:
  - The exact time in HH:MM:SS.nnnn format (with milliseconds)
  - The epoch timestamp
- **Mark Storage**: Each time module can store up to 4 marks. New marks are added to the top, and older marks are removed when the limit is reached.

### Rearranging Tiles

- **Desktop**: Click and drag tiles to rearrange them
- **Touch Devices**: Long-press and drag tiles to rearrange them
- Tiles will show a visual indicator when being dragged

## Project Structure

```
pi-splay/
├── dist/              # Compiled output files
├── src/
│   ├── components/    # React-like component classes
│   │   ├── TileManager.ts
│   │   └── TimeModule.ts
│   ├── styles/
│   │   └── main.sass   # SASS styles with Tailwind
│   ├── utils/
│   │   └── time.ts     # Time utility functions
│   ├── types.ts        # TypeScript type definitions
│   └── main.ts         # Application entry point
├── index.html          # Main HTML file
├── package.json        # Dependencies and scripts
├── tailwind.config.js  # Tailwind CSS configuration
└── tsconfig.json       # TypeScript configuration
```

## Technologies

- **TypeScript**: Type-safe JavaScript
- **esbuild**: Fast JavaScript bundler for production builds
- **Tailwind CSS**: Utility-first CSS framework
- **SASS**: CSS preprocessor with indented syntax
- **HTML5**: Modern web standards

## Browser Support

The dashboard is designed to work on modern browsers that support:
- ES2020 JavaScript features
- CSS Grid
- Touch events
- Drag and Drop API

Recommended browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)
