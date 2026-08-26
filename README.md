# Ammodo Website Scripts

This repository contains custom JavaScript scripts for the public Ammodo websites, including implementations for Science, Art, and General websites.
All of the files in this repository are for use for the public and does not contain any private information.

## Overview

The scripts in this repository handle various functionalities across the Ammodo website:

| Script | Purpose | Used On |
|--------|---------|---------|
| `event-sorting.js` | Sorts and categorizes events by month (current, next, and future) | Art |
| `filter-count.js` | Manages filter counts in the UI for CMS filter components | Art, Science |
| `filters-science.js` | Specialized filters for Science section, including year-based filtering | Science |
| `filters.js` | General filtering implementation with year range support | Art |
| `hide-date-seperator.js` | Hides date separators when start/end dates are identical | Art |
| `rich-text-rows.js` | Processes rich text content to create image rows based on caption markers | Art, Science, General |
| `ammodo-map.js` | Interactive world map of projects, with markers, popup gallery and Finsweet-driven filtering | Architecture |

## Script Usage by Website

### Ammodo Art
- **filters.js, filter-count.js**: 
  - /art
  - /art/projects
  - /art/artists
  - /art/partners
- **event-sorting.js**:
  - /whats-on
- **rich-text-rows.js**:
  - /art/projects/project-template 
  - /art/artists/artist-template
  - /art/partners/partner-template
  - /stories/story-template
- **hide-date-seperator.js**:
  - /art/projects/project-template


### Ammodo Science
- **filters.js, filter-count.js**: 
  - /research
  - /research/fellowship
  - /research/fundamental-research
  - /research/groundbreaking-research
- **rich-text-rows.js**:
  - /research/research-template 
  - /stories/story-template

### Ammodo General
- **rich-text-rows.js**:
  - /stories/story-template

### Ammodo Architecture
- **ammodo-map.js** (in the page `<head>`, not before `</body>` — see below):
  - /projects
  - /projects/local-scale
  - /projects/social-engagement
  - /projects/social-architecture

## Development Guide

### Prerequisites

- Node.js (check package.json for version compatibility)
- npm or yarn

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Stichting-Ammodo/ammodo-site-scripts.git
   cd ammodo-site-scripts
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Building/Minifying Scripts

The project uses Terser for minification. To build and minify all scripts:

```bash
npm run build
```

This command will:
1. Find all JavaScript files in the project
2. Minify them using Terser
3. Output the minified versions to a `dist` directory

### Deployment

#### Automatic Deployment with jsDelivr

This project leverages jsDelivr's GitHub integration for CDN hosting. When you create a new release in GitHub:

1. Tag a new version in git and push it:
   ```bash
   git tag v1.x.x
   git push origin v1.x.x
   ```

2. Create a release in GitHub based on this tag

3. The files will automatically be available via jsDelivr at:
   ```
   https://cdn.jsdelivr.net/gh/Stichting-Ammodo/ammodo-site-scripts@[version]/[filename]
   ```
   **You don't need to specify the complete version number you can specify the major version and JSdelivr will automatically serve the latest version within the major version.*

For example:
```
https://cdn.jsdelivr.net/gh/Stichting-Ammodo/ammodo-site-scripts@1/dist/event-sorting.min.js
```

#### Manual Integration

To manually add scripts to a webpage:

1. Reference the jsDelivr URL in your HTML:
   ```html
   <script src="https://cdn.jsdelivr.net/gh/Stichting-Ammodo/ammodo-site-scripts@1.0.0/dist/event-sorting.min.js"></script>
   ```

2. Or download the minified file from the `dist` directory and upload it to your web server.

## Script Documentation

### event-sorting.js

Self-executing function that sorts events into monthly categories:
- Current month
- Next month
- Two months ahead 
- Upcoming (beyond)

Dependencies:
- DayJS library for date manipulation

### filter-count.js

Handles filter count display in the UI:
- Updates count badges next to filter categories
- Manages filter reset functionality

### filters-science.js and filters.js

Handle content filtering with special focus on:
- Year-based filtering
- Dynamic generation of year filter options
- Zero state handling when no results found

Dependencies:
- Webflow CMS Filter (fs-attributes)

### hide-date-seperator.js

Simple utility that:
- Hides date separators when start and end dates are identical
- Improves UI cleanliness for single-day events

### rich-text-rows.js

Processes rich text content with special caption markers:
- `[row]` - Groups images into a single row
- `[new-row]` - Starts a new row
- Removes these markers from the visible caption text



### ammodo-map.js

Replaces the MapLibre map from the old React site (`ammodo-awards-react`). Renders a full-viewport world map behind the projects grid and turns the existing `.filters1_view-button` into a map/grid toggle. Opens on the map.

Project data is read from whichever Finsweet Collection List is on the page, so the same script serves `/projects` and the three pre-filtered award pages with no configuration. It aborts quietly if the page has no Collection List, and logs an error if it finds more than one.

**Dependencies**
- MapLibre GL JS 5.24.0, loaded from CDN by the script itself
- `dist/map-style.json` — self-contained basemap (Natural Earth 110m land, no tile server, no API key)
- Webflow CMS Filter (fs-attributes) — the map subscribes to `renderitems` and mirrors the result, so region/year/search all drive the markers

**Webflow data contract** — each `.blog2_item` needs two hidden divs:
```html
<div class="display-none" data-map-coords>{{ Location Coordinates }}</div>
<div class="display-none" data-map-location>{{ Location Text }}</div>
```
And the project detail template needs `data-project-gallery="true"` on `.image-gallery_container`. The popup gallery is fetched from the detail page because Webflow cannot bind a multi-image field inside a Collection List — and inlining ~50 projects' galleries would add roughly half a megabyte of markup.

**Styling is split in two:**
- *Plumbing*, inlined in `ammodo-map.js` — positioning, the `is-map-view` rules, stacking, `display` on the controls and help text, and MapLibre overrides.
- *Design*, in the site's **global style block** — paste `src/ammodo-map.global.css` (the unminified file) and replace it wholesale so rules cannot duplicate.

Two rules that will break the map if ignored, both learned the hard way:
1. **Never set `transform` on `.ammodo-marker`.** MapLibre writes its positioning transform there as an inline style, so a competing rule either silently does nothing or throws markers into the page corner. Marker transforms belong on `.ammodo-marker_inner`.
2. **Never set `display` on `.ammodo-control` or `.ammodo-help`.** The script owns it — desktop-only is behaviour, not design.

Related gotcha in the gallery carousel: with CSS scroll-snap, *reading* `scrollLeft` forces the layout that triggers the snap, so a read behaves as a mutation. Snap has to be suppressed before the position is read, not after.

**Versioning.** Unlike the other scripts, this one is pinned to an exact tag rather than `@1`, and `STYLE_URL` inside the script is pinned too. Releasing means bumping the tag, the four `<script src>` tags in Webflow, and `STYLE_URL` if the basemap ever changes. The script must stay in the `<head>`: it hides the grid before first paint, and running it before `</body>` reintroduces a flash of the grid while MapLibre loads.

## License

This project is licensed under the ATABIX License - see package.json for details.
