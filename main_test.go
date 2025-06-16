package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestFilterAndSortActivities(t *testing.T) {
	activities := []map[string]interface{}{
		{"name": "Ride to Terminus", "description": "", "start_date": "2025-06-14T10:00:00Z"},
		{"name": "Morning Ride", "description": "Terminus hill", "start_date": "2025-06-15T09:00:00Z"},
		{"name": "Evening Ride", "description": "", "start_date": "2025-06-13T18:00:00Z"},
	}
	filtered := filterAndSortActivities(activities)
	if len(filtered) != 2 {
		t.Errorf("Expected 2 activities, got %d", len(filtered))
	}
	if filtered[0]["start_date"] != "2025-06-15T09:00:00Z" {
		t.Errorf("Expected most recent activity first, got %v", filtered[0]["start_date"])
	}
}

func TestFilterAndSortActivities_NoMatch(t *testing.T) {
	activities := []map[string]interface{}{
		{"name": "Morning Ride", "description": "", "start_date": "2025-06-15T09:00:00Z"},
		{"name": "Evening Ride", "description": "", "start_date": "2025-06-13T18:00:00Z"},
	}
	filtered := filterAndSortActivities(activities)
	if len(filtered) != 0 {
		t.Errorf("Expected 0 activities, got %d", len(filtered))
	}
}

func TestFilterAndSortActivities_MissingFields(t *testing.T) {
	activities := []map[string]interface{}{
		{"start_date": "2025-06-15T09:00:00Z"},
		{"name": "Terminus Ride"},
	}
	filtered := filterAndSortActivities(activities)
	if len(filtered) != 1 {
		t.Errorf("Expected 1 activity, got %d", len(filtered))
	}
}

func TestWriteActivitiesJSON(t *testing.T) {
	rec := httptest.NewRecorder()
	acts := []map[string]interface{}{{"name": "Test Ride"}}
	writeActivitiesJSON(rec, acts)
	if rec.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rec.Code)
	}
	var out []map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Errorf("Failed to unmarshal JSON: %v", err)
	}
	if out[0]["name"] != "Test Ride" {
		t.Errorf("Expected 'Test Ride', got %v", out[0]["name"])
	}
}

func TestFetchAllActivitiesEmpty(t *testing.T) {
	// This test is a placeholder since fetchAllActivities requires a real token and Strava API.
	// In a real-world scenario, you would mock the HTTP client.
}

func TestActivitiesHandler_Unauthenticated(t *testing.T) {
	req := httptest.NewRequest("GET", "/activities", nil)
	rec := httptest.NewRecorder()
	activitiesHandler(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 for unauthenticated, got %d", rec.Code)
	}
}

func TestActivitiesHandler_Cached(t *testing.T) {
	userID := "123"
	userTokens[userID] = "dummy-token"
	activityCache.Lock()
	activityCache.data[userID] = struct {
		activities []map[string]interface{}
		timestamp  time.Time
	}{[]map[string]interface{}{{"name": "Cached Ride"}}, time.Now()}
	activityCache.Unlock()
	req := httptest.NewRequest("GET", "/activities", nil)
	req.AddCookie(&http.Cookie{Name: "user_id", Value: userID})
	rec := httptest.NewRecorder()
	activitiesHandler(rec, req)
	if rec.Code != http.StatusOK {
		t.Errorf("Expected 200 for cached activities, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Cached Ride") {
		t.Errorf("Expected 'Cached Ride' in response, got %s", rec.Body.String())
	}
}

func TestActivitiesHandler_FetchSuccess(t *testing.T) {
	userID := "456"
	userTokens[userID] = "dummy-token"
	// Save original fetchAllActivities and restore after test
	origFetch := fetchAllActivities
	defer func() { fetchAllActivities = origFetch }()
	// Mock fetchAllActivities to return a known activity that matches the filter
	fetchAllActivities = func(token string) ([]map[string]interface{}, error) {
		return []map[string]interface{}{{"name": "API Ride to Terminus", "start_date": "2025-06-16T10:00:00Z"}}, nil
	}
	// Clear cache
	activityCache.Lock()
	delete(activityCache.data, userID)
	activityCache.Unlock()
	// Make request
	req := httptest.NewRequest("GET", "/activities", nil)
	req.AddCookie(&http.Cookie{Name: "user_id", Value: userID})
	rec := httptest.NewRecorder()
	activitiesHandler(rec, req)
	if rec.Code != http.StatusOK {
		t.Errorf("Expected 200 for successful fetch, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "API Ride to Terminus") {
		t.Errorf("Expected 'API Ride to Terminus' in response, got %s", rec.Body.String())
	}
}

func TestActivitiesHandler_FetchError(t *testing.T) {
	userID := "789"
	userTokens[userID] = "dummy-token"
	origFetch := fetchAllActivities
	defer func() { fetchAllActivities = origFetch }()
	fetchAllActivities = func(token string) ([]map[string]interface{}, error) {
		return nil, fmt.Errorf("API error")
	}
	activityCache.Lock()
	delete(activityCache.data, userID)
	activityCache.Unlock()
	req := httptest.NewRequest("GET", "/activities", nil)
	req.AddCookie(&http.Cookie{Name: "user_id", Value: userID})
	rec := httptest.NewRecorder()
	activitiesHandler(rec, req)
	if rec.Code != http.StatusInternalServerError {
		t.Errorf("Expected 500 for fetch error, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Failed to fetch activities") {
		t.Errorf("Expected error message in response, got %s", rec.Body.String())
	}
}

func TestLoginHandler_Redirect(t *testing.T) {
	req := httptest.NewRequest("GET", "/login", nil)
	rec := httptest.NewRecorder()
	loginHandler(rec, req)
	if rec.Code != http.StatusFound {
		t.Errorf("Expected 302 redirect, got %d", rec.Code)
	}
	loc := rec.Header().Get("Location")
	if !strings.Contains(loc, "strava.com/oauth/authorize") {
		t.Errorf("Expected Strava authorize URL, got %s", loc)
	}
}

func TestOauthCallbackHandler_MissingCode(t *testing.T) {
	req := httptest.NewRequest("GET", "/oauth/callback", nil)
	rec := httptest.NewRecorder()
	oauthCallbackHandler(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 for missing code, got %d", rec.Code)
	}
}
