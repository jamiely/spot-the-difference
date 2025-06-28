# Spot the Difference

A modern HTML5-based "Spot the Difference" game built with vanilla JavaScript using ES6 modules, Vite for development tooling, and Vitest for testing.

## Features

- **Background & Sprite System** with configurable sprite placement
- **Edit Mode** for creating custom bounding boxes (Press 'E')
- **Placement Mode** for dragging sprites freely (Press 'P')
- **JSON Export/Import** for bounding boxes and sprite positions
- **Collision Detection** to prevent sprite overlap
- **Modular JavaScript architecture** using ES6 imports/exports
- **Event-driven component communication** for loose coupling
- **Responsive design** that works on desktop and mobile
- **Comprehensive test suite** with Vitest
- **Modern development workflow** with Vite

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:
```bash
npm run dev
```

The game will open in your browser at `http://localhost:5173`.

Generate assets configuration from directory contents:
```bash
npm run generate-assets
```

### Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:coverage
```

### Building

Build for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## How to Play

1. The game loads automatically with a background image and sprites
2. Sprites are placed within predefined bounding boxes to avoid collisions
3. The game is designed as a "spot the difference" style experience with interactive sprites

### Game Modes

#### Edit Mode (Press 'E')
- Create and edit bounding boxes for sprite placement
- Drag on the background to create new bounding boxes
- Double-click boxes to remove them
- Export/import bounding box configurations as JSON
- Visual indicators show all defined areas

#### Placement Mode (Press 'P')
- Drag sprites freely to reposition them
- Positions are saved relative to the background image
- Export/import sprite positions as JSON
- Useful for creating custom sprite arrangements

## Architecture

The game uses a modular architecture with the following key components:

### Core Components
- **Game.js** - Main game controller and state management
- **SpriteManager.js** - Sprite loading, positioning, and collision detection
- **EditMode.js** - Bounding box creation and management (Press 'E')
- **PlacementMode.js** - Sprite dragging and positioning (Press 'P')
- **ScoreDisplay.js** - Score UI and animations

### Utilities
- **BackgroundLoader.js** - Background image loading and management
- **AssetConfigLoader.js** - Centralized JSON configuration loading

### Configuration
- **BoundingBoxConfig.js** - Background-specific bounding boxes and sprite counts
- **assets.json** - List of available backgrounds and sprites

Components communicate through custom DOM events for loose coupling and maintainability.

## Project Structure

```
├── index.html              # Main HTML entry point
├── js/
│   ├── main.js            # Application entry point
│   ├── Game.js            # Main game controller
│   ├── components/        # UI components
│   │   ├── EditMode.js    # Bounding box editor
│   │   ├── PlacementMode.js # Sprite placement tool
│   │   ├── SpriteManager.js # Sprite management
│   │   └── ScoreDisplay.js # Score UI
│   ├── config/            # Configuration files
│   │   └── BoundingBoxConfig.js # Background configs
│   └── utils/             # Utility modules
│       ├── AssetConfigLoader.js # JSON config loader
│       └── BackgroundLoader.js # Background loader
├── config/
│   └── assets.json        # Available assets list
├── backgrounds/           # Background images
├── sprites/              # Sprite images
├── scripts/
│   └── generate-assets.js # Asset list generator
├── styles/
│   └── main.css          # Styling
├── tests/                # Unit tests
└── package.json          # Dependencies and scripts
```

## Technologies Used

- **HTML5 & DOM manipulation** for sprite and background rendering
- **ES6 Modules** for modular JavaScript architecture
- **CSS3** with modern features (Flexbox, Grid, animations)
- **JSON configuration** for asset management and game data
- **Drag & Drop API** for interactive sprite placement
- **Vite** for fast development and building
- **Vitest** for unit testing with DOM simulation
- **Happy-DOM** for browser API simulation in tests

## Asset Management

The game uses a JSON-based configuration system:

- **Backgrounds**: Place images in `backgrounds/` directory
- **Sprites**: Place images in `sprites/` directory
- **Auto-generation**: Run `npm run generate-assets` to update `config/assets.json`
- **Configuration**: Edit `js/config/BoundingBoxConfig.js` for background-specific settings