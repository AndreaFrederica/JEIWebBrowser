# JEI Web Browser

A special overlay browser designed for gamers.

## Features
- **Overlay Mode**: Stays on top of full-screen borderless games.
- **Global Shortcut**: Toggle visibility with `Ctrl+F8` (configurable in source).
- **Tabs & History**: Basic browser features.
- **Bookmarks**: Save your favorite pages.

## Installation
1. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

## Usage
1. Start the application:
   ```bash
   npm start
   # or
   yarn start
   ```
2. The browser will launch.
3. Use `Ctrl+F8` to toggle the window show/hide.
4. Use the "Pin" icon in the top bar to toggle "Always on Top" mode.

## Development
- Main process: `index.js`
- Renderer process: `renderer.js`
- Styles: `style.css`

## Configuration
- Default start page: Google (change in `renderer.js`)
- Shortcut: `CommandOrControl+F8` (change in `index.js`)
