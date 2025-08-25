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
- Filters activities by the challenge start date and the "Terminus" keyword
- Parallel fetching of activity pages for faster data collection
- Interactive web UI with card and table views
- **No user authentication required** - data is pre-fetched and served statically

## Architecture
- **Frontend**: Static HTML/CSS/JavaScript served via GitHub Pages
- **Data Source**: Weekly GitHub Action fetches Strava data and generates `activities.json`
- **Deployment**: Automatic GitHub Pages deployment after data updates
- **Filtering Logic**: TypeScript script (converted from original Go logic)

## Requirements
- Node.js 20+ (for GitHub Actions)
- GitHub repository with Pages enabled
- Strava API access token (stored in GitHub Secrets)

## Setup

### For GitHub Pages Deployment:
1. **Fork/Clone the repository**
2. **Enable GitHub Pages** in repository settings (source: GitHub Actions)
3. **Set up Strava API credentials** in GitHub Secrets:
   - Go to repository Settings → Secrets and variables → Actions
   - Add `STRAVA_ACCESS_TOKEN`: Your personal Strava API access token
   - [Instructions to get Strava access token](https://developers.strava.com/docs/getting-started/#account)
4. **Trigger the workflow**:
   - Manual: Go to Actions tab → "Update Strava Activities" → "Run workflow"
   - Automatic: Every Sunday at 23:00 GMT

### For Local Development:
1. **Clone the repository:**
   ```sh
   git clone <repo-url>
   cd tube-cycling-challenge
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Set environment variable:**
   ```sh
   export STRAVA_ACCESS_TOKEN=your_token_here
   ```

4. **Fetch activities and build:**
   ```sh
   npm run fetch-activities
   ```

5. **Serve locally:**
   ```sh
   cd static
   python3 -m http.server 8080
   # Visit http://localhost:8080
   ```

## User Interface
The web UI displays:
- **Header**: Custom TFL and cycling-themed logos with the challenge title.
- **Login Button**: Shown if you are not logged in with Strava.
- **Loading Indicator**: Displays while activities are being fetched.
- **Toggle View Button**: Switch between card and tabular views.
- **Card View**: Each activity shows:
  - Ride name (linked to Strava)
  - Date (formatted with proper ordinal suffixes - e.g., "1st January 2023")
  - Distance (km), Time, Average Speed (km/h), Elevation Gain (m)
- **Tabular View**: Table with sortable columns for:
  - Ride name (linked to Strava)
  - Date, Distance, Time, Speed, Elevation
  - Totals and averages in the footer
  - **Sorting**: Click any column header to sort by that column (ascending/descending)
- **Animated Road Markings**: Visual elements in the footer that dynamically update based on the number of activities
- **View Persistence**: The app remembers your preferred view (card or table) between sessions using localStorage

## How It Works
- **Scheduled Data Fetching**: A GitHub Action runs every Sunday at 23:00 GMT to fetch the latest Strava activities
- **Data Processing**: The action fetches activities in parallel from the Strava API (up to 10 pages) using a pre-configured access token
- **Filtering**: Activities are filtered by date (after March 22, 2025) and keyword ("terminus" in name or description)
- **Static Generation**: Filtered activities are saved as `static/activities.json` and committed to the repository
- **Automatic Deployment**: GitHub Pages automatically deploys the updated static site
- **Interactive UI**: Users can view activities as cards or in a sortable table, with totals and averages shown

## Configuration
- **Schedule**: Modify the cron expression in `.github/workflows/update-activities.yml` to change update frequency
- **Data Range**: Adjust the date filtering in `scripts/fetch-activities.ts` (currently after March 22, 2025)
- **Filtering Logic**: Modify the `filterAndSortActivities` function in `scripts/fetch-activities.ts`
- **UI Logic**: Customize the frontend in `static/script.js` and `static/index.html`
- **Parallel Fetching**: Adjust `maxPages` in `scripts/fetch-activities.ts` (default: 10 pages)

## Project Structure
- **`.github/workflows/update-activities.yml`** — GitHub Action for scheduled data fetching
- **`scripts/fetch-activities.ts`** — TypeScript script to fetch and process Strava data
- **`static/`** — GitHub Pages static site files
  - **`index.html`** — Frontend UI
  - **`script.js`** — Frontend logic for displaying activities
  - **`style.css`** — Styling
  - **`activities.json`** — Generated data file (updated weekly)
- **`main.go`** — Legacy Go server (kept for reference/local development)
- **`main_test.go`** — Tests for filtering logic
- **`package.json`** — Node.js dependencies for GitHub Action
- **`tsconfig.json`** — TypeScript configuration

## License
MIT

## Credits
- [Strava API Documentation](https://developers.strava.com/docs/)
- Vibe Coding :D
- GitHub Copilot

---

Feel free to contribute or open issues for improvements!