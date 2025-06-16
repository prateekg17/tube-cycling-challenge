# Prateek's Tube Cycling Challenge

A Go web application that integrates with the Strava API to fetch, filter, and display my cycling activities for a self-made Tube challenge I am undertaking.

As part of this Tube challenge, I'm cycling to and from all the terminus Tube stations from my home within the London Tfl underground network.
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

The app supports user authentication via OAuth, activity caching, and parallel fetching for improved performance.

## Features
- Strava OAuth login
- Fetches user activities from Strava
- Filters activities by the challenge start date and the Terminus keyword
- Caches activities per user for 10 minutes
- Parallel fetching of activity pages for faster load times
- Simple web UI (static/index.html)

## Requirements
- Go 1.18+
- Strava API credentials (Client ID, Client Secret, Redirect URI)

## Setup
1. **Clone the repository:**
   ```sh
   git clone <repo-url>
   cd tube-cycling-challenge
   ```
2. **Set environment variables:**
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
   - `STRAVA_REDIRECT_URI` (e.g., `http://localhost:8080/oauth/callback`)

3. **Run the application:**
   ```sh
   go run main.go
   ```

4. **Open your browser:**
   Visit [http://localhost:8080](http://localhost:8080)

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
  - Distance, Time, Speed, Elevation
  - Totals and averages in the footer
  - **Sorting**: Click any column header to sort by that column (ascending/descending)
- **Animated Road Markings**: Visual elements in the footer that dynamically update based on the number of activities
- **View Persistence**: The app remembers your preferred view (card or table) between sessions using localStorage

## How It Works
- Users log in with Strava via OAuth.
- The app fetches activities in parallel from the Strava API (up to 10 pages by default).
- Activities are filtered and sorted before being displayed.
- Results are cached per user for 10 minutes to reduce API calls and improve performance.
- Users can view activities as cards or in a sortable table, with totals and averages shown in the table view.

## Configuration
- Adjust the number of parallel pages fetched by changing `maxPages` in `main.go`.
- Filtering logic can be modified in `filterAndSortActivities`.
- UI logic is in `static/script.js` and `static/index.html`.

## Project Structure
- `main.go` — Main application logic
- `static/index.html` — Frontend UI
- `static/script.js` — Frontend logic for fetching and displaying activities
- `main_test.go` — Tests (if any)

## License
MIT

## Credits
- [Strava API Documentation](https://developers.strava.com/docs/)
- Vibe Coding :D
- GitHub Copilot

---

Feel free to contribute or open issues for improvements!