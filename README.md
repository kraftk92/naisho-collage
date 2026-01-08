# Naisho Collage

A dynamic, automated photo and video collage for **Naisho**, powered by **Google Sheets** and **Google Drive**.

This web application fetches media URLs and metadata from a managed Google Sheet and renders them in a responsive, aesthetic grid. It supports both images and videos (hosted on Google Drive), providing a seamless viewing experience.

## Features

### 📸 Dynamic Content
- **Google Sheets Backend**: Content is managed entirely via a Google Sheet. No code changes needed to add/remove photos.
- **Auto-Update**: The collage automatically reflects changes from the sheet.

### 🎥 Robust Video Support
- **Smart Detection**: Automatically detects Google Drive video links.
- **Visuals**: Displays "moody", high-contrast thumbnails (using CSS filters) instead of black empty frames.
- **Play Interaction**: Features a custom, branded "Gold" play button.
- **Reliability**: Clicking a video tile opens the content directly in Instagram (or the source link) to ensure perfect playback on all devices/browsers.

### 🎨 Design & Layout
- **Brand Identity**: Uses Naisho's branded colors (Red/Gold) and fonts.
- **Clean Grid**: 
  - Desktop: Maximum **3 columns** centered layout for a premium look.
  - Mobile: Responsive 2-column layout.
- **Animations**: Subtle hover effects and scale transitions for an engaging feel.

## Tech Stack
- **Frontend**: Vanilla HTML/CSS/JS (Lightweight, no build step required).
- **Services**: 
  - Google Sheets API (via JSON endpoint) for data.
  - Google Drive for media hosting.

## Setup & usage

1. **Google Sheet**: Ensure the Google Sheet is "Published to the Web" as CSV/JSON.
2. **Media**: 
   - Upload photos/videos to Google Drive.
   - Ensure "Anyone with the link" permission is set.
   - Paste the Drive link into the Google Sheet.
3. **Deployment**:
   - The site is static and can be deployed to GitHub Pages, Netlify, or embedded via Iframe.

## Customization

### Key Files
- `app.js`: Contains logic for fetching data, parsing Drive IDs, and rendering tiles.
- `style.css`: Contains the grid layout, responsiveness, and brand styling.

### Configuration
- **Columns**: The grid is capped at 3 columns in `style.css` (`.grid`).
- **Colors**: Brand accent colors like `#bc8c4e` (Gold) are defined in the CSS.