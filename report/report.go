package report

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/jinzhu/gorm"
	"github.com/traggo/server/model"
)

// Handler generates markdown reports for a given date
func Handler(db *gorm.DB, apiKey string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Check API key if configured
		if apiKey != "" {
			providedKey := r.URL.Query().Get("apiKey")
			if providedKey != apiKey {
				http.Error(w, "Unauthorized: Invalid or missing API key", http.StatusUnauthorized)
				return
			}
		}
		// Extract date from URL path (format: /api/report/yyyy-mm-dd)
		path := r.URL.Path
		if !strings.HasPrefix(path, "/api/report/") {
			http.Error(w, "Invalid path", http.StatusBadRequest)
			return
		}

		dateStr := strings.TrimPrefix(path, "/api/report/")
		if dateStr == "" {
			http.Error(w, "Date is required", http.StatusBadRequest)
			return
		}

		// Parse and validate the date
		date, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			http.Error(w, "Invalid date format. Use yyyy-mm-dd", http.StatusBadRequest)
			return
		}

		// Generate markdown content
		markdown, err := generateMarkdown(db, date, dateStr)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to generate report: %v", err), http.StatusInternalServerError)
			return
		}

		// Set headers for file download
		w.Header().Set("Content-Type", "text/markdown; charset=utf-8")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.md\"", dateStr))

		w.Write([]byte(markdown))
	}
}

func generateMarkdown(db *gorm.DB, date time.Time, dateStr string) (string, error) {
	var builder strings.Builder

	// Format date for display (e.g., "Monday, January 1, 2024")
	displayDate := date.Format("Monday, January 2, 2006")
	builder.WriteString(fmt.Sprintf("# %s\n\n", displayDate))

	// Add daily trackers section
	dailyTrackers, err := getDailyTrackers(db, dateStr)
	if err != nil {
		return "", err
	}
	if len(dailyTrackers) > 0 {
		builder.WriteString("## Daily Trackers\n\n")
		for _, dt := range dailyTrackers {
			value := formatTrackerValue(dt)
			builder.WriteString(fmt.Sprintf("- **%s**: %s\n", dt.Tracker.Name, value))
		}
		builder.WriteString("\n")
	}

	// Add time spans section
	builder.WriteString("## Timespans\n\n")
	timeSpans, err := getTimeSpans(db, date)
	if err != nil {
		return "", err
	}
	for _, ts := range timeSpans {
		tags := formatTags(ts.Tags)
		note := ts.Note
		duration := formatDuration(ts.StartUserTime, *ts.EndUserTime)
		startTime := ts.StartUserTime.Format("3:04 PM")

		builder.WriteString(fmt.Sprintf("%s\n%s\n", tags, note))
		builder.WriteString(fmt.Sprintf(" - %s (%s)\n\n", duration, startTime))
	}

	return builder.String(), nil
}

func getDailyTrackers(db *gorm.DB, dateStr string) ([]model.DailyTrackerValue, error) {
	var values []model.DailyTrackerValue
	err := db.Where("date = ?", dateStr).
		Preload("Tracker").
		Find(&values).Error
	return values, err
}

func getTimeSpans(db *gorm.DB, date time.Time) ([]model.TimeSpan, error) {
	// Get start and end of day in UTC
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)
	endOfDay := startOfDay.Add(24 * time.Hour)

	var timeSpans []model.TimeSpan
	// Query time spans that overlap with the given date
	err := db.Preload("Tags").
		Where("end_user_time IS NOT NULL").
		Where("start_user_time < ? AND end_user_time >= ?", endOfDay, startOfDay).
		Order("start_user_time ASC").
		Find(&timeSpans).Error
	return timeSpans, err
}

func formatTrackerValue(v model.DailyTrackerValue) string {
	switch v.Tracker.Type {
	case model.TypeBoolean:
		if v.BoolValue {
			return "✓"
		}
		return "✗"
	case model.TypeNumber:
		return fmt.Sprintf("%.0f", v.NumberValue)
	case model.TypeText:
		if v.TextValue == "" {
			return "-"
		}
		return v.TextValue
	default:
		return "-"
	}
}

func formatTags(tags []model.TimeSpanTag) string {
	if len(tags) == 0 {
		return ""
	}
	var tagStrings []string
	for _, t := range tags {
		tagStrings = append(tagStrings, fmt.Sprintf("%s:%s", t.Key, t.StringValue))
	}
	return strings.Join(tagStrings, ", ")
}

func formatDuration(start, end time.Time) string {
	duration := end.Sub(start)
	minutes := int(duration.Minutes())
	if minutes < 60 {
		return fmt.Sprintf("%dm", minutes)
	}
	hours := minutes / 60
	mins := minutes % 60
	return fmt.Sprintf("%dh %dm", hours, mins)
}
