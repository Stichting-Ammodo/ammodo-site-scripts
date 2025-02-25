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



## License

This project is licensed under the ATABIX License - see package.json for details.
