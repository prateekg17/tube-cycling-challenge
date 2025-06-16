package main

import (
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strings"
	"sync"
	"time"
)

var (
	clientID     = os.Getenv("STRAVA_CLIENT_ID")
	clientSecret = os.Getenv("STRAVA_CLIENT_SECRET")
	redirectURI  = os.Getenv("STRAVA_REDIRECT_URI")
)

var userTokens = make(map[string]string) // In-memory user token storage (for demo)

// Activity cache per user
var activityCache = struct {
	sync.RWMutex
	data map[string]struct {
		activities []map[string]interface{}
		timestamp  time.Time
	}
}{data: make(map[string]struct {
	activities []map[string]interface{}
	timestamp  time.Time
})}

func main() {
	http.HandleFunc("/", serveIndex)
	http.HandleFunc("/login", loginHandler)
	http.HandleFunc("/oauth/callback", oauthCallbackHandler)
	http.HandleFunc("/activities", activitiesHandler)
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))
	log.Println("Server started at http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func serveIndex(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "static/index.html")
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	params := url.Values{}
	params.Add("client_id", clientID)
	params.Add("redirect_uri", redirectURI)
	params.Add("response_type", "code")
	params.Add("scope", "activity:read")
	loginUrl := fmt.Sprintf("https://www.strava.com/oauth/authorize?%s", params.Encode())
	http.Redirect(w, r, loginUrl, http.StatusFound)
}

func oauthCallbackHandler(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Missing code", http.StatusBadRequest)
		return
	}
	// Exchange code for access token
	resp, err := http.PostForm("https://www.strava.com/oauth/token", url.Values{
		"client_id":     {clientID},
		"client_secret": {clientSecret},
		"code":          {code},
		"grant_type":    {"authorization_code"},
	})
	if err != nil {
		http.Error(w, "Token exchange failed", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var tokenResp struct {
		AccessToken string `json:"access_token"`
		Athlete     struct {
			ID int `json:"id"`
		} `json:"athlete"`
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		http.Error(w, "Invalid token response", http.StatusInternalServerError)
		return
	}
	userID := fmt.Sprintf("%d", tokenResp.Athlete.ID)
	userTokens[userID] = tokenResp.AccessToken
	// Set user ID in cookie
	cookie := &http.Cookie{
		Name:     "user_id",
		Value:    userID,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	}
	http.SetCookie(w, cookie)
	http.Redirect(w, r, "/", http.StatusFound)
}

func activitiesHandler(w http.ResponseWriter, r *http.Request) {
	startOverall := time.Now()
	cookie, err := r.Cookie("user_id")
	if err != nil {
		http.Error(w, "Not authenticated", http.StatusUnauthorized)
		return
	}
	token, ok := userTokens[cookie.Value]
	if !ok {
		http.Error(w, "Token not found", http.StatusUnauthorized)
		return
	}

	// Check cache (10 min expiry)
	activityCache.RLock()
	cache, found := activityCache.data[cookie.Value]
	activityCache.RUnlock()
	if found && time.Since(cache.timestamp) < 10*time.Minute {
		writeActivitiesJSON(w, cache.activities)
		log.Printf("Total /activities response time (from cache): %s", time.Since(startOverall))
		return
	}

	allActivities, err := fetchAllActivities(token)
	if err != nil {
		http.Error(w, "Failed to fetch activities", http.StatusInternalServerError)
		return
	}
	filtered := filterAndSortActivities(allActivities)
	activityCache.Lock()
	activityCache.data[cookie.Value] = struct {
		activities []map[string]interface{}
		timestamp  time.Time
	}{filtered, time.Now()}
	activityCache.Unlock()
	writeActivitiesJSON(w, filtered)
	log.Printf("Total /activities response time: %s", time.Since(startOverall))
}

// Change from function to variable holding a function for testability
var fetchAllActivities = func(token string) ([]map[string]interface{}, error) {
	var allActivities []map[string]interface{}
	var mu sync.Mutex
	var wg sync.WaitGroup
	results := make(chan []map[string]interface{}, 10)
	errChan := make(chan error, 1)
	maxPages := 10 // Fetch up to 10 pages in parallel (adjust as needed)

	for page := 1; page <= maxPages; page++ {
		wg.Add(1)
		go func(page int) {
			defer wg.Done()
			activities, err := fetchActivitiesPage(token, page)
			if err != nil {
				errChan <- err
				return
			}
			if len(activities) > 0 {
				results <- activities
			}
		}(page)
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	for acts := range results {
		mu.Lock()
		allActivities = append(allActivities, acts...)
		mu.Unlock()
	}

	select {
	case err := <-errChan:
		return nil, err
	default:
	}

	return allActivities, nil
}

// Helper to fetch a single page of activities
func fetchActivitiesPage(token string, page int) ([]map[string]interface{}, error) {
	req, _ := http.NewRequest("GET", "https://www.strava.com/api/v3/athlete/activities", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	q := req.URL.Query()
	q.Set("per_page", "200")
	q.Set("page", fmt.Sprintf("%d", page))
	// Add date range: after March 1, 2025, before now
	marchStart := time.Date(2025, 3, 22, 0, 0, 0, 0, time.UTC).Unix()
	now := time.Now().Unix()
	q.Set("after", fmt.Sprintf("%d", marchStart))
	q.Set("before", fmt.Sprintf("%d", now))
	req.URL.RawQuery = q.Encode()
	// Explicitly request gzip encoding
	req.Header.Set("Accept-Encoding", "gzip")
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var reader io.Reader = resp.Body
	if resp.Header.Get("Content-Encoding") == "gzip" {
		gzr, err := gzip.NewReader(resp.Body)
		if err != nil {
			return nil, err
		}
		defer gzr.Close()
		reader = gzr
	}
	body, _ := io.ReadAll(reader)
	var activities []map[string]interface{}
	if err := json.Unmarshal(body, &activities); err != nil {
		return nil, err
	}
	return activities, nil
}

func filterAndSortActivities(activities []map[string]interface{}) []map[string]interface{} {
	var filtered []map[string]interface{}
	for _, act := range activities {
		name, _ := act["name"].(string)
		desc, _ := act["description"].(string)
		if strings.Contains(strings.ToLower(name), "terminus") || strings.Contains(strings.ToLower(desc), "terminus") {
			filtered = append(filtered, act)
		}
	}
	sort.Slice(filtered, func(i, j int) bool {
		di, _ := filtered[i]["start_date"].(string)
		dj, _ := filtered[j]["start_date"].(string)
		return di > dj // descending order
	})
	return filtered
}

func writeActivitiesJSON(w http.ResponseWriter, activities []map[string]interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(activities)
}
