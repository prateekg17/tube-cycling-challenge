# Prateek's Tube Cycling Challenge

A GitHub Pages static site that displays my cycling activities for a self-made Tube challenge. The site automatically updates weekly with new Strava activities via a scheduled GitHub Action.

As part of this Tube challenge, I'm cycling to and from all the terminus Tube stations from my home within the London TfL underground network.
There are a total of 33 such Tube stations spread across the following lines:
- District Line
- Piccadilly Line
- Central Line
- Hammersmith & City Line
- Bakerloo Line
- Circle Line
- Jubilee Line
- Victoria Line
- Northern Line
- Metropolitan Line
- Waterloo & City Line

The site features automated data fetching, parallel API calls, and an interactive web UI with no authentication required.

## Features
- **Automated weekly updates** via GitHub Actions (every Sunday at 23:00 GMT)
- **Static site** hosted on GitHub Pages - no server required
- Fetches activities from Strava API with pre-configured authentication
- Filters activities by the challenge start date and the "terminus" keyword
- Parallel fetching of activity pages for faster data collection
- Interactive web UI with card and table views
- **Follow Me on Strava** badge in header
- **No user authentication required** - data is pre-fetched and served statically
- **Unit tests** (Vitest) for core data logic and API helper functions
- **CI workflow** runs tests automatically on pull requests
- **Concurrency control** prevents overlapping update/deploy runs

## Architecture
- **Frontend**: Static HTML/CSS/JavaScript served via GitHub Pages
- **Data Source**: Weekly GitHub Action fetches Strava data and generates `activities.json`
- **Deployment**: Automatic GitHub Pages deployment after data updates
- **Filtering Logic**: TypeScript script that filters activities by date and keywords
- **Testing**: Vitest for deterministic unit tests (fetch mocked)

## Requirements
- Node.js 20+ (local + GitHub Actions) – project uses native ESM (`"type": "module"`) and `NodeNext` module resolution
- GitHub repository with Pages enabled
- Strava API credentials:
    - `STRAVA_CLIENT_ID` (GitHub Actions Variable)
    - `STRAVA_CLIENT_SECRET` (Secret)
    - `STRAVA_REFRESH_TOKEN` (Secret)

## Setup

### For GitHub Pages Deployment
1. **Fork/Clone the repository**
2. **Enable GitHub Pages** in repository settings (source: GitHub Actions)
3. **Set up Strava API credentials** in GitHub Secrets and Variables:
   - Settings → Secrets and variables → Actions
   - Add Variable: `STRAVA_CLIENT_ID`
   - Add Secrets: `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`
   - [How to obtain credentials](https://developers.strava.com/docs/getting-started/#account)
4. **Trigger the workflow**:
   - Manual: Actions → "Update Strava Activities" → Run workflow
   - Automatic: Every Sunday at 23:00 GMT

### For Local Development
1. Clone repository:
   ```sh
   git clone <repo-url>
   cd tube-cycling-challenge
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. (Optional for full fetch) Export environment variables:
   ```sh
   export STRAVA_CLIENT_ID=your_client_id
   export STRAVA_CLIENT_SECRET=your_client_secret
   export STRAVA_REFRESH_TOKEN=your_refresh_token
   ```
4. Fetch activities & build:
   ```sh
   npm run fetch-activities
   ```
5. Serve locally:
   ```sh
   npx serve static -l 8080
   # or
   (cd static && python3 -m http.server 8080)
   ```
6. Open: http://localhost:8080

### Running Tests
Tests mock network I/O and do not require Strava credentials.
```sh
npm test
```
To run in watch mode:
```sh
npx vitest
```

## Continuous Integration (CI)
- **Workflow**: `.github/workflows/test.yaml` runs on pull requests (open, reopen, synchronize, label) and executes the Vitest suite.
- **Strava credentials not required** for tests (fetch is mocked).
- **Scheduled fetch & deploy**: `.github/workflows/update-activities.yaml` handles weekly data refresh and Pages deployment.
- **Page deployment artifact name**: `site-static` (contains the entire `static/` directory including `index.html`, images, and `activities.json`).
- **No duplicate runs**: Concurrency group `update-activities` prevents overlapping scheduled/manual executions.
- The generated `activities.json` is not committed; it is produced during the workflow and shipped inside the deployment artifact.

## User Interface
The web UI displays:
- **Header**: Custom TFL & cycling-themed logos, challenge title, and a Strava follow badge.
- **Toggle View Button**: Switch between card and tabular views.
- **Card View**: Each activity shows ride name, date, stats, description (if present).
- **Tabular View**: Sortable columns (name, date, distance, time, speed, elevation) with totals/averages.
- **Animated Road Markings**: Visual footer elements scaled to activity count.
- **Empty State Message**: Clear message when no activities match the filter.
- **View Persistence**: Preferred view stored in `localStorage`.

## How It Works
1. **Workflow runs** (cron or manual) → refresh Strava token → parallel fetch up to 10 pages.
2. **Filtering**: Only activities after 22 Mar 2025 containing keyword "terminus" in name or description.
3. **Output**: Filtered list written to `static/activities.json` in the runner workspace.
4. **Artifact**: Entire `static` folder uploaded as `site-static`; deployment job publishes it to Pages.
5. **Frontend**: Static site fetches `activities.json` client-side to render UI.

## Configuration
- **Schedule**: Edit cron in `.github/workflows/update-activities.yaml`.
- **Date Range**: Update `after` logic in `fetchActivitiesPage` inside `scripts/fetch-activities.ts`.
- **Keyword Filter**: Modify `filterAndSortActivities` in `scripts/fetch-activities.ts`.
- **Parallelism**: Change `maxPages` in `fetchAllActivities` (default 10).
- **Tests**: Add more cases under `scripts/*.test.ts` (Vitest auto-detects by pattern).

## Project Structure
- `.github/workflows/update-activities.yaml` – Scheduled Strava fetch & deploy (artifact: `site-static`)
- `.github/workflows/test.yaml` – PR test CI
- `scripts/fetch-activities.ts` – Strava fetch & processing (ESM / NodeNext)
- `scripts/fetch-activities.test.ts` – Unit tests (Vitest, mocked fetch)
- `static/` – Site assets (`index.html`, `style.css`, `script.js`, `activities.json`, images)
- `package.json` – Dependencies & scripts
- `tsconfig.json` – TypeScript config (ES2022 target, NodeNext resolution)

## Notes on ESM / NodeNext
- Project uses `"type": "module"` and `"moduleResolution": "NodeNext"`.
- Relative imports in tests use explicit `.js` extensions after compilation (Vitest handles TypeScript transpile in-memory).
- `node-fetch@3` (ESM) is used directly—no downgrade or CommonJS wrapper required.

## License
MIT

## Credits
- [Strava API Documentation](https://developers.strava.com/docs/)
- GitHub Copilot

---
Contributions & suggestions welcome!
