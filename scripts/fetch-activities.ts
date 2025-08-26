/**
 * Strava Activities Fetcher for GitHub Pages
 *
 * This script fetches cycling activities from the Strava API and generates
 * a static JSON file for the GitHub Pages site.
 *
 * Filters for activities containing "terminus" in name or description,
 * and fetches activities after March 22, 2025.
 *
 * Run by GitHub Actions weekly on Sundays at 23:00 GMT.
 */

import {writeFileSync} from 'fs';
import {dirname, join} from 'path';
import {fileURLToPath} from 'url';
import fetch from 'node-fetch';

// ES module replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface StravaActivity {
    id: number;
    name: string;
    description?: string;
    start_date: string;
    distance?: number;
    moving_time?: number;
    total_elevation_gain?: number;

    [key: string]: any;
}

/**
 * Fetch access token using refresh token from Strava API
 */
async function getAccessToken(): Promise<string> {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    const refreshToken = process.env.STRAVA_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('Missing Strava OAuth environment variables');
    }

    const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to refresh access token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string };
    return data.access_token;
}

/**
 * Fetch a single page of activities from Strava API
 */
async function fetchActivitiesPage(token: string, page: number): Promise<StravaActivity[]> {
    const url = new URL('https://www.strava.com/api/v3/athlete/activities');
    url.searchParams.set('per_page', '200');
    url.searchParams.set('page', page.toString());

    // Add date range: after March 22, 2025, before now
    const marchStart = Math.floor(new Date('2025-03-22T00:00:00Z').getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);
    url.searchParams.set('after', marchStart.toString());
    url.searchParams.set('before', now.toString());

    const response = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept-Encoding': 'gzip'
        }
    });

    if (!response.ok) {
        throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
    }

    return await response.json() as StravaActivity[];
}

/**
 * Fetch all activities from Strava API using parallel requests
 */
async function fetchAllActivities(token: string): Promise<StravaActivity[]> {
    const maxPages = 10; // Fetch up to 10 pages in parallel
    const promises: Promise<StravaActivity[]>[] = [];

    for (let page = 1; page <= maxPages; page++) {
        promises.push(fetchActivitiesPage(token, page));
    }

    try {
        const results = await Promise.all(promises);
        const allActivities: StravaActivity[] = [];

        for (const activities of results) {
            if (activities.length > 0) {
                allActivities.push(...activities);
            }
        }

        return allActivities;
    } catch (error) {
        console.error('Error fetching activities:', error);
        throw error;
    }
}

/**
 * Filter and sort activities by keyword and date
 */
function filterAndSortActivities(activities: StravaActivity[]): StravaActivity[] {
    const filtered = activities.filter(activity => {
        const name = (activity.name || '').toLowerCase();
        const description = (activity.description || '').toLowerCase();
        return name.includes('terminus') || description.includes('terminus');
    });

    // Sort by start_date descending (most recent first)
    filtered.sort((a, b) => {
        const dateA = a.start_date || '';
        const dateB = b.start_date || '';
        if (dateA > dateB) return -1;
        if (dateA < dateB) return 1;
        return 0;
    });

    return filtered;
}

/**
 * Main function to fetch and save activities
 */
async function main() {
    const accessToken = await getAccessToken();

    try {
        console.log('Fetching activities from Strava API...');
        const allActivities = await fetchAllActivities(accessToken);
        console.log(`Fetched ${allActivities.length} total activities`);

        const filteredActivities = filterAndSortActivities(allActivities);
        console.log(`Filtered to ${filteredActivities.length} activities with "terminus" keyword`);

        // Save to static/activities.json
        const outputPath = join(__dirname, '..', 'static', 'activities.json');
        writeFileSync(outputPath, JSON.stringify(filteredActivities, null, 2));
        console.log(`Activities saved to ${outputPath}`);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

// Run the main function
main().catch(console.error);