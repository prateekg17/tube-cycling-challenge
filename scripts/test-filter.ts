import fetch from 'node-fetch';
import { writeFileSync } from 'fs';
import { join } from 'path';

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
 * Filter and sort activities (same logic as Go version)
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
    return dateA > dateB ? -1 : dateA < dateB ? 1 : 0;
  });

  return filtered;
}

// Test the filtering logic
function testFilterAndSortActivities() {
  const testActivities: StravaActivity[] = [
    {
      id: 1,
      name: "Ride to Terminus",
      description: "",
      start_date: "2025-06-14T10:00:00Z"
    },
    {
      id: 2,
      name: "Morning Ride",
      description: "Terminus hill",
      start_date: "2025-06-15T09:00:00Z"
    },
    {
      id: 3,
      name: "Evening Ride",
      description: "",
      start_date: "2025-06-13T18:00:00Z"
    }
  ];

  const filtered = filterAndSortActivities(testActivities);
  console.log('Test Results:');
  console.log(`Expected 2 activities, got ${filtered.length}`);
  console.log(`Expected most recent first: ${filtered[0]?.start_date === "2025-06-15T09:00:00Z"}`);
  
  if (filtered.length === 2 && filtered[0]?.start_date === "2025-06-15T09:00:00Z") {
    console.log('✅ Test passed - filtering logic matches Go version');
  } else {
    console.log('❌ Test failed');
    console.log('Filtered results:', filtered);
  }
}

// Run test
testFilterAndSortActivities();