# Spot the Difference

A modern HTML5-based "Spot the Difference" game built with vanilla JavaScript using ES6 modules, Vite for development tooling, and Vitest for testing.

## Features

- **HTML5 Canvas-based gameplay** with side-by-side image comparison
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

The game will open in your browser at `http://localhost:3000`.

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

1. Click "Start Game" to begin
2. Two similar images will appear side by side
3. Click on the differences you spot between the images
4. Found differences will be highlighted with red circles
5. Try to find all differences to complete the game

## Architecture

The game uses a modular architecture with the following key components:

- **Game.js** - Main game controller and state management
- **GameBoard.js** - Canvas rendering and click detection
- **ScoreDisplay.js** - Score UI and animations
- **ImageGenerator.js** - Procedural image generation with differences

Components communicate through custom DOM events for loose coupling and maintainability.

## Project Structure

```
├── index.html              # Main HTML entry point
├── js/
│   ├── main.js            # Application entry point
│   ├── Game.js            # Main game controller
│   ├── components/        # UI components
│   └── utils/             # Utility modules
├── styles/
│   └── main.css          # Styling
├── tests/                 # Unit tests
└── package.json          # Dependencies and scripts
```

## Technologies Used

- **HTML5 Canvas** for image rendering and interaction
- **ES6 Modules** for modular JavaScript architecture
- **CSS3** with modern features (Flexbox, Grid, animations)
- **Vite** for fast development and building
- **Vitest** for unit testing with DOM simulation
- **Happy-DOM** for browser API simulation in tests