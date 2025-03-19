# Browser Tab Sync

A lightweight, TypeScript-based application that synchronizes activity across multiple browser tabs in real-time. This tool allows users to coordinate tab states, track active tabs, and switch between them using keyboard shortcuts.

## Features

- **Cross-Tab Communication**: Seamless real-time synchronization between multiple browser tabs
- **Visual Tab Indicators**: Dynamic favicon and UI indicators showing tab status and number
- **Keyboard Navigation**: Press 1-9 keys to instantly switch between tabs
- **Active Tab Tracking**: Clearly shows which tab is currently active across all instances
- **Auto Recovery**: Automatically assigns a new active tab if the current one is closed
- **Persistent Tab IDs**: Maintains tab identity across page refreshes

## How It Works

Browser Tab Sync uses the `BroadcastChannel` API to enable communication between tabs. Each tab:

1. Generates a unique ID on creation
2. Broadcasts its presence to other tabs
3. Maintains a heartbeat to indicate it's still active
4. Updates its state based on messages from other tabs
5. Visually indicates its status (active/inactive)

The application provides both visual cues in the UI and updates the favicon to show tab numbers and active state, making it easy to identify tabs even when minimized.

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/browser-tab-sync.git

# Navigate to the project folder
cd browser-tab-sync

# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm run dev
```

### Production Build

```bash
# Build for production
npm run build

# Preview the production build
npm run preview
```

## Usage

1. Open the application in multiple browser tabs
2. Each tab will automatically receive a sequential number
3. Press a number key (1-9) to activate the corresponding tab
4. The active tab is highlighted in yellow with a pulsing border
5. The favicon updates to show the tab number (helpful in taskbar)
6. Click on any tab in the list to activate it

## Tech Stack

- React 18
- TypeScript
- Vite
- BroadcastChannel API

## Project Structure

```
browser-tab-sync/
├── src/
│   ├── App.tsx         # Main application component
│   ├── App.css         # Application styles
│   ├── main.tsx        # Entry point
│   └── vite-env.d.ts   # Vite type definitions
├── package.json        # Project dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

## Use Cases

- **Development Environment**: Keep track of multiple related development tabs
- **Presentations**: Coordinate slides or demos across multiple browser tabs
- **Dashboard Monitoring**: Synchronize monitoring dashboards
- **Multi-Step Forms**: Coordinate multi-page forms across tabs

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 15.4+
- Edge 79+

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Inspired by the need to coordinate multiple browser tabs during development
- Uses the BroadcastChannel API for efficient cross-tab communication
