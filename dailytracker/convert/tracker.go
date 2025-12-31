package convert

import (
	"fmt"
	"time"

	"github.com/jinzhu/gorm"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// CalculateStreak computes consecutive days with values for a tracker
func CalculateStreak(db *gorm.DB, trackerID int, now time.Time) (int, []string) {
	var values []model.DailyTrackerValue
	db.Where("tracker_id = ?", trackerID).Order("date DESC").Find(&values)

	if len(values) == 0 {
		return 0, []string{}
	}

	// Build a map of dates that have values
	datesWithValues := make(map[string]bool)
	for _, v := range values {
		// Determine which value column is populated
		hasValue := false
		if v.TextValue != "" {
			hasValue = true
		} else if v.NumberValue != 0 {
			hasValue = true
		} else if v.BoolValue {
			hasValue = true
		}
		datesWithValues[v.Date] = hasValue
	}

	// Calculate consecutive days backwards from today
	streak := 0
	checkDate := now.Format("2006-01-02")

	for datesWithValues[checkDate] {
		streak++
		t, _ := time.Parse("2006-01-02", checkDate)
		checkDate = t.AddDate(0, 0, -1).Format("2006-01-02")
	}

	// Calculate milestones
	badges := []string{}
	milestones := []int{7, 14, 30, 60, 90, 100, 365}
	for _, m := range milestones {
		if streak >= m {
			badges = append(badges, fmt.Sprintf("%d days", m))
		}
	}

	return streak, badges
}

// externalTrackerType converts model.TrackerType to gqlmodel.TrackerType
func externalTrackerType(t model.TrackerType) gqlmodel.TrackerType {
	switch t {
	case model.TypeText:
		return gqlmodel.TrackerTypeText
	case model.TypeNumber:
		return gqlmodel.TrackerTypeNumber
	case model.TypeBoolean:
		return gqlmodel.TrackerTypeBoolean
	default:
		return gqlmodel.TrackerTypeText
	}
}

// ToExternalTracker converts a model.DailyTracker to gqlmodel.DailyTracker
func ToExternalTracker(tracker model.DailyTracker, db *gorm.DB, now time.Time) (*gqlmodel.DailyTracker, error) {
	streak, badges := CalculateStreak(db, tracker.ID, now)

	return &gqlmodel.DailyTracker{
		ID:             tracker.ID,
		Name:           tracker.Name,
		Type:           externalTrackerType(tracker.Type),
		Chainable:      tracker.Chainable,
		Color:          tracker.Color,
		StreakDays:     streak,
		MilestoneBadges: badges,
	}, nil
}

// ToExternalValue converts a model.DailyTrackerValue to gqlmodel.DailyTrackerValue
func ToExternalValue(value model.DailyTrackerValue) *gqlmodel.DailyTrackerValue {
	var tracker *gqlmodel.DailyTracker
	if value.Tracker.ID != 0 {
		tracker = &gqlmodel.DailyTracker{
			ID:        value.Tracker.ID,
			Name:      value.Tracker.Name,
			Type:      externalTrackerType(value.Tracker.Type),
			Chainable: value.Tracker.Chainable,
			Color:     value.Tracker.Color,
			// Note: streak is calculated on-demand in ToExternalTracker
			StreakDays:     0,
			MilestoneBadges: []string{},
		}
	}

	var textValue *string
	if value.TextValue != "" {
		textValue = &value.TextValue
	}

	var numberValue *float64
	// For Number type trackers, always return the value (even if 0)
	if value.Tracker.Type == model.TypeNumber {
		numberValue = &value.NumberValue
	} else if value.NumberValue != 0 {
		numberValue = &value.NumberValue
	}

	return &gqlmodel.DailyTrackerValue{
		ID:         value.ID,
		TrackerID:  value.TrackerID,
		Tracker:    tracker,
		Date:       value.Date,
		TextValue:  textValue,
		NumberValue: numberValue,
		BoolValue:  &value.BoolValue,
	}
}
