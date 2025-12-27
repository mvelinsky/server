package dailytracker

import (
	"context"
	"time"

	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
	"github.com/traggo/server/dailytracker/convert"
)

// DailyTrackers returns all daily trackers for the current user.
func (r *ResolverForDailyTracker) DailyTrackers(ctx context.Context) ([]*gqlmodel.DailyTracker, error) {
	userID := auth.GetUser(ctx).ID

	var trackers []model.DailyTracker
	if err := r.DB.Where("user_id = ?", userID).Find(&trackers).Error; err != nil {
		return nil, err
	}

	result := []*gqlmodel.DailyTracker{}
	now := time.Now()
	for _, tracker := range trackers {
		converted, err := convert.ToExternalTracker(tracker, r.DB, now)
		if err != nil {
			return nil, err
		}
		result = append(result, converted)
	}

	return result, nil
}

// DailyTrackerValues returns all tracker values for the given date range.
func (r *ResolverForDailyTracker) DailyTrackerValues(ctx context.Context, fromInclusive string, toInclusive string) ([]*gqlmodel.DailyTrackerValue, error) {
	userID := auth.GetUser(ctx).ID

	// Get tracker IDs for this user
	var trackerIDs []int
	if err := r.DB.Model(&model.DailyTracker{}).Where("user_id = ?", userID).Pluck("id", &trackerIDs).Error; err != nil {
		return nil, err
	}

	if len(trackerIDs) == 0 {
		return []*gqlmodel.DailyTrackerValue{}, nil
	}

	var values []model.DailyTrackerValue
	if err := r.DB.Where("tracker_id IN (?)", trackerIDs).
		Where("date >= ?", fromInclusive).
		Where("date <= ?", toInclusive).
		Preload("Tracker"). // Preload the tracker relationship
		Find(&values).Error; err != nil {
		return nil, err
	}

	result := []*gqlmodel.DailyTrackerValue{}
	for _, value := range values {
		converted := convert.ToExternalValue(value)
		result = append(result, converted)
	}

	return result, nil
}
