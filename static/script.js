/**
 * @typedef {Object} Activity
 * @property {number} id - Activity ID
 * @property {string} name - Activity name
 * @property {string} [description] - Activity description
 * @property {string} [start_date] - ISO date string
 * @property {number} [distance] - Distance in meters
 * @property {number} [moving_time] - Moving time in seconds
 * @property {number} [total_elevation_gain] - Elevation gain in meters
 */

// Common table cell styles for reuse
const tableCellStyle = "padding:8px;border:1px solid #ccc;text-align:center;";
const tableCellStyleLeft = "padding:8px;border:1px solid #ccc;";
const tableCellStyleNoWrap = "padding:8px;border:1px solid #ccc;text-align:center;white-space:nowrap;";

// Cache DOM elements
const elements = {
  loader: document.getElementById('loader'),
  login: document.querySelector('.header-login'), // Updated to use header login
  toggleBtn: document.getElementById('toggle-table-view'),
  activities: document.getElementById('activities'),
  tableView: document.getElementById('table-view'),
  cycleImageContainer: document.getElementById('cycle-image-container')
};

// Ensure the cycle image is visible by default on page load
if (elements.cycleImageContainer) elements.cycleImageContainer.style.display = '';

// Dynamically adjust padding if road is visible
function adjustActivitiesPadding() {
    if (!elements.activities) return;
    const road = document.querySelector('.cycle-road-bg');
    if (!road) return;
    // Check if road is visible in viewport
    const rect = elements.activities.getBoundingClientRect();
    const roadRect = road.getBoundingClientRect();
    // Only add extra padding if needed - reduce the threshold to minimize extra space
    if (rect.bottom > roadRect.top - 10) {
        elements.activities.setAttribute('data-has-road', 'true');
    } else {
        elements.activities.removeAttribute('data-has-road');
    }
}
window.addEventListener('resize', adjustActivitiesPadding);
// Call after activities are loaded
/**
 * @type {Activity[]}
 */
let activitiesData = [];

async function fetchActivities() {
    elements.loader.removeAttribute('hidden');
    elements.login.classList.add('hidden');
    elements.toggleBtn.classList.add('hidden');
    document.querySelector('.view-toggle').classList.add('hidden'); // Hide the container using class
    // To hide both views while loading
    elements.activities.classList.add('hidden');
    elements.tableView.classList.add('hidden');
    elements.activities.innerHTML = '';

    // Remove has-content class when no content is shown
    document.body.classList.remove('has-content');

    try {
        const res = await fetch('/activities');
        elements.loader.setAttribute('hidden', '');

        if (res.status === 401) {
            elements.login.classList.remove('hidden');
            if (elements.cycleImageContainer) elements.cycleImageContainer.classList.remove('hidden');
            return;
        }

        if (!res.ok) {
            elements.login.classList.remove('hidden');
            if (elements.cycleImageContainer) elements.cycleImageContainer.classList.remove('hidden');
            return;
        }

        if (elements.cycleImageContainer) elements.cycleImageContainer.classList.add('hidden');
        const activities = await res.json();
        activitiesData = activities;

        if (activities.length === 0) {
            elements.activities.innerHTML = '<p>No activities found for the Tube Cycling Challenge."</p>';
            elements.toggleBtn.classList.add('hidden'); // Hide if no activities
            elements.activities.classList.remove('hidden'); // Show card view if no activities
            // Show login and image if no activities (user not logged in or no data)
            elements.login.classList.remove('hidden');
            if (elements.cycleImageContainer) elements.cycleImageContainer.classList.remove('hidden');
            return;
        }

        // Add has-content class when content is shown
        document.body.classList.add('has-content');

        renderCardView(activities);
        elements.toggleBtn.classList.remove('hidden');
        document.querySelector('.view-toggle').classList.remove('hidden'); // Show the container using class

        // Show the correct view after loading
        const viewMode = localStorage.getItem('viewMode');
        if (viewMode === 'table') {
            elements.activities.classList.add('hidden');
            elements.tableView.classList.remove('hidden');
            elements.toggleBtn.textContent = TOGGLE_VIEW_LABELS.card;
            renderTableView();
            tableVisible = true;
        } else {
            elements.activities.classList.remove('hidden');
            elements.tableView.classList.add('hidden');
            elements.toggleBtn.textContent = TOGGLE_VIEW_LABELS.table;
            tableVisible = false;
        }

        adjustActivitiesPadding();
    } catch (error) {
        console.error('Error fetching activities:', error);
        elements.loader.style.display = 'none';
        elements.activities.innerHTML = '<p>Error loading activities. Please try again later.</p>';
        elements.activities.style.display = '';
    }
}
let tableSort = { column: null, asc: true };

// Helper to format activity meta fields
/**
 * @param {Activity} a
 */
function formatActivityMeta(a) {
    return {
        distance: a.distance ? (a.distance / 1000).toFixed(2) + ' km' : 'N/A',
        time: a.moving_time ? formatDuration(a.moving_time) : 'N/A',
        speed: a.distance && a.moving_time ? calcSpeed(a.distance, a.moving_time) + ' km/h' : 'N/A',
        elevation: a.total_elevation_gain ? a.total_elevation_gain.toFixed(0) + ' m' : 'N/A'
    };
}

function renderTableView() {
    /** @type {Activity[]} */
    let sorted = [...activitiesData];

    // Sorting logic
    if (tableSort.column) {
        sorted.sort((a, b) => {
            let aVal, bVal;
            switch(tableSort.column) {
                case 'distance':
                    aVal = a.distance || 0;
                    bVal = b.distance || 0;
                    break;
                case 'time':
                    aVal = a.moving_time || 0;
                    bVal = b.moving_time || 0;
                    break;
                case 'speed':
                    aVal = a.distance && a.moving_time ? a.distance / a.moving_time : 0;
                    bVal = b.distance && b.moving_time ? b.distance / b.moving_time : 0;
                    break;
                case 'elevation':
                    aVal = a.total_elevation_gain || 0;
                    bVal = b.total_elevation_gain || 0;
                    break;
            }
            return tableSort.asc ? aVal - bVal : bVal - aVal;
        });
    }

    // Calculate totals - perform only one loop over the data
    const totals = sorted.reduce((sum, a) => {
        return {
            distance: sum.distance + (a.distance || 0),
            moving_time: sum.moving_time + (a.moving_time || 0),
            elevation: sum.elevation + (a.total_elevation_gain || 0)
        };
    }, { distance: 0, moving_time: 0, elevation: 0 });

    const totalDistanceDisplay = totals.distance ? (totals.distance / 1000).toFixed(2) + ' km' : 'N/A';
    const avgSpeedDisplay = (totals.distance && totals.moving_time) ?
        ((totals.distance / 1000) / (totals.moving_time / 3600)).toFixed(2) + ' km/h' : 'N/A';
    const totalElevationDisplay = totals.elevation ? totals.elevation.toFixed(0) + ' m' : 'N/A';
    const totalTimeDisplay = totals.moving_time ? formatDuration(totals.moving_time) : 'N/A';

    // Set table styles once - UPDATED WITH STRONGER FIX FOR THE GAP
    elements.tableView.style.position = 'relative';
    elements.tableView.style.overflowX = 'auto';
    elements.tableView.style.overflowY = 'visible';
    elements.tableView.style.maxHeight = 'none';
    elements.tableView.style.paddingBottom = '0';
    elements.tableView.style.marginTop = '-1em';
    // Remove the bottom margin since road is now relative
    elements.tableView.style.marginLeft = 'auto';
    elements.tableView.style.marginRight = 'auto';

    // Build table header with sort indicators
    const getSortIcon = column => {
        if (tableSort.column !== column) {
            return '';
        }

        let icon = tableSort.asc ? '▲' : '▼';
        return `<span style='font-size:0.9em;'>${icon}</span>`;
    };

    const tableHeader = `
        <thead>
            <tr style="background:#e6f6fb;">
                <th style="${tableCellStyle}">#</th>
                <th style="${tableCellStyleLeft}">Ride Name</th>
                <th id="sort-distance" style="${tableCellStyleLeft};cursor:pointer;user-select:none;white-space:nowrap;">🚴 Distance ${getSortIcon('distance')}</th>
                <th id="sort-time" style="${tableCellStyleLeft};cursor:pointer;user-select:none;white-space:nowrap;">⏱️ Time ${getSortIcon('time')}</th>
                <th id="sort-speed" style="${tableCellStyleLeft};cursor:pointer;user-select:none;white-space:nowrap;">⚡ Speed ${getSortIcon('speed')}</th>
                <th id="sort-elevation" style="${tableCellStyleLeft};cursor:pointer;user-select:none;white-space:nowrap;">⛰️ Elevation ${getSortIcon('elevation')}</th>
            </tr>
        </thead>
    `;

    // Build table rows
    const tableRows = sorted.map((a, i) => {
        const { distance, time, speed, elevation } = formatActivityMeta(a);
        return `<tr>
            <td style="${tableCellStyle}">${i + 1}</td>
            <td style="${tableCellStyleNoWrap}"><a href="https://www.strava.com/activities/${a.id}" target="_blank" rel="noopener" style="color:#0019a8;text-decoration:underline;">${a.name}</a></td>
            <td style="${tableCellStyleNoWrap}">${distance}</td>
            <td style="${tableCellStyleNoWrap}">${time}</td>
            <td style="${tableCellStyleNoWrap}">${speed}</td>
            <td style="${tableCellStyleNoWrap}">${elevation}</td>
        </tr>`;
    }).join('');

    // Build table footer with totals
    const tableFooter = `
        <tr style="background:#f5f5f5;">
            <td style="${tableCellStyle};font-weight:bold;"></td>
            <td style="${tableCellStyle};font-weight:bold;">Total</td>
            <td style="${tableCellStyleNoWrap};font-weight:bold;">${totalDistanceDisplay}</td>
            <td style="${tableCellStyleNoWrap};font-weight:bold;">${totalTimeDisplay}</td>
            <td style="${tableCellStyleNoWrap};font-weight:bold;">${avgSpeedDisplay}</td>
            <td style="${tableCellStyleNoWrap};font-weight:bold;">${totalElevationDisplay}</td>
        </tr>
    `;

    // Combine all parts into final HTML - UPDATED TO CENTER THE TABLE CONTENT
    elements.tableView.innerHTML = `
        <div style="position:relative;margin:0 auto;width:100%;z-index:5;">
            <div style="overflow-x:auto;position:relative;z-index:5;">
                <table style="width:100%;border-collapse:collapse;background:#fff;margin:0 auto;position:relative;z-index:5;">
                    ${tableHeader}
                    <tbody>
                        ${tableRows}
                        ${tableFooter}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Add sorting event listeners
    const handleSortClick = column => {
        if (tableSort.column === column) {
            tableSort.asc = !tableSort.asc;
        } else {
            tableSort.column = column;
            tableSort.asc = false;
        }
        renderTableView();
    };

    document.getElementById('sort-distance').onclick = () => handleSortClick('distance');
    document.getElementById('sort-time').onclick = () => handleSortClick('time');
    document.getElementById('sort-speed').onclick = () => handleSortClick('speed');
    document.getElementById('sort-elevation').onclick = () => handleSortClick('elevation');
}

// Render the card view for activities
/**
 * @param {Activity[]} activities
 */
function renderCardView(activities) {
    if (!activities || activities.length === 0) {
        elements.activities.innerHTML = '<p>No activities found with "Terminus".</p>';
        return;
    }

    elements.activities.innerHTML = activities.map(a => {
        const { distance, time, speed, elevation } = formatActivityMeta(a);
        return `
        <a class="activity" href="https://www.strava.com/activities/${a.id}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none;display:block;">
            <strong>${a.name}</strong>
            ${a.start_date ? `<em>${formatDate(a.start_date)}</em>` : ''}
            <span class="description">${a.description || ''}</span>
            <div class="activity-meta">
                <span class="distance">🚴 ${distance}</span>
                <span class="time">⏱️ ${time}</span>
                <span class="speed">⚡ ${speed}</span>
                <span class="elevation">⛰️ ${elevation}</span>
            </div>
        </a>
        `;
    }).join('');
}

// Ensure road markings are visible on initial load and also on login page
window.addEventListener('DOMContentLoaded', () => {
    const markingsContainer = document.getElementById('cycle-road-markings');
    // Only add default markings if there are no activities
    const activityCards = document.querySelectorAll('#activities .activity');
    if (markingsContainer) {
        markingsContainer.innerHTML = '';
        if (activityCards.length === 0) {
            for (let i = 0; i < 5; i++) {
                const marking = document.createElement('div');
                marking.className = 'cycle-road-marking';
                markingsContainer.appendChild(marking);
            }
        }
    }
});

// Centralize toggle button labels
const TOGGLE_VIEW_LABELS = {
    card: 'See Card View',
    table: 'See Tabular View'
};

// Memoization cache for expensive calculations
const memoCache = {
    formatDate: new Map(),
    formatDuration: new Map(),
    calcSpeed: new Map()
};

// Memoized formatting functions
function formatDuration(seconds) {
    if (seconds === undefined || seconds === null) return 'N/A';

    // Check cache first
    const cacheKey = seconds.toString();
    if (memoCache.formatDuration.has(cacheKey)) {
        return memoCache.formatDuration.get(cacheKey);
    }

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const result = `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;

    // Store in cache
    memoCache.formatDuration.set(cacheKey, result);
    return result;
}

function formatDate(dateStr) {
    if (!dateStr) return '';

    // Check cache first
    if (memoCache.formatDate.has(dateStr)) {
        return memoCache.formatDate.get(dateStr);
    }

    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    const daySuffix = (d) => {
        if (d > 3 && d < 21) return 'th';
        switch (d % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    };

    const result = `${day}${daySuffix(day)} ${month} ${year}`;

    // Store in cache
    memoCache.formatDate.set(dateStr, result);
    return result;
}

function calcSpeed(distance, moving_time) {
    // distance in meters, moving_time in seconds
    if (!distance || !moving_time) return 'N/A';

    // Check cache first
    const cacheKey = `${distance}-${moving_time}`;
    if (memoCache.calcSpeed.has(cacheKey)) {
        return memoCache.calcSpeed.get(cacheKey);
    }

    const speed = (distance / 1000) / (moving_time / 3600); // km/h
    const result = speed.toFixed(2);

    // Store in cache
    memoCache.calcSpeed.set(cacheKey, result);
    return result;
}

let tableVisible = false;

// Toggle between card and table view
function toggleView() {
    tableVisible = !tableVisible;

    // Update view visibility using CSS classes
    if (tableVisible) {
        elements.activities.classList.add('hidden');
        elements.tableView.classList.remove('hidden');
    } else {
        elements.activities.classList.remove('hidden');
        elements.tableView.classList.add('hidden');
    }

    // Update button text
    elements.toggleBtn.textContent = tableVisible ? TOGGLE_VIEW_LABELS.card : TOGGLE_VIEW_LABELS.table;

    // Save preference to localStorage
    localStorage.setItem('viewMode', tableVisible ? 'table' : 'card');

    // Render table if needed
    if (tableVisible) {
        renderTableView();
    }
}
elements.toggleBtn.addEventListener('click', toggleView);

// Set initial button label on page load
const initialViewMode = localStorage.getItem('viewMode');
elements.toggleBtn.textContent = initialViewMode === 'table' ? TOGGLE_VIEW_LABELS.card : TOGGLE_VIEW_LABELS.table;

// Initial fetch and render
void fetchActivities();
