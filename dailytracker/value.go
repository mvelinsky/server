package dailytracker

import (
	"context"
	"fmt"
	"time"

	"github.com/jinzhu/gorm"
	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
	"github.com/traggo/server/dailytracker/convert"
)

// SetDailyTrackerValue sets or updates a tracker value for a specific date.
func (r *ResolverForDailyTracker) SetDailyTrackerValue(
	ctx context.Context,
	trackerID int,
	date string,
	textValue *string,
	numberValue *float64,
	boolValue *bool,
) (*gqlmodel.DailyTrackerValue, error) {
	userID := auth.GetUser(ctx).ID

	// Verify tracker exists and belongs to user
	tracker := model.DailyTracker{}
	if r.DB.Where("id = ? AND user_id = ?", trackerID, userID).Find(&tracker).RecordNotFound() {
		return nil, fmt.Errorf("tracker not found")
	}

	// Validate date format (YYYY-MM-DD)
	if _, err := time.Parse("2006-01-02", date); err != nil {
		return nil, fmt.Errorf("invalid date format, expected YYYY-MM-DD")
	}

	// Build the value record based on tracker type
	value := model.DailyTrackerValue{
		TrackerID: trackerID,
		Date:      date,
	}

	// Set appropriate value based on tracker type
	switch tracker.Type {
	case model.TypeText:
		if textValue != nil {
			value.TextValue = *textValue
		}
	case model.TypeNumber:
		if numberValue != nil {
			value.NumberValue = *numberValue
		}
	case model.TypeBoolean:
		if boolValue != nil {
			value.BoolValue = *boolValue
		}
	}

	// Check if exists, update or create
	existing := model.DailyTrackerValue{}
	if !r.DB.Where("tracker_id = ? AND date = ?", trackerID, date).Find(&existing).RecordNotFound() {
		// Update existing
		value.ID = existing.ID
		value.CreatedAt = existing.CreatedAt
		value.UpdatedAt = model.Time(time.Now())
		if err := r.DB.Save(&value).Error; err != nil {
			return nil, err
		}
	} else {
		// Create new
		value.CreatedAt = model.Time(time.Now())
		value.UpdatedAt = model.Time(time.Now())
		if err := r.DB.Create(&value).Error; err != nil {
			return nil, err
		}
	}

	// Reload with tracker
	if err := r.DB.Preload("Tracker").First(&value, value.ID).Error; err != nil {
		return nil, err
	}

	return convert.ToExternalValue(value), nil
}

// RemoveDailyTrackerValue removes a tracker value.
func (r *ResolverForDailyTracker) RemoveDailyTrackerValue(ctx context.Context, id int) (*gqlmodel.DailyTrackerValue, error) {
	userID := auth.GetUser(ctx).ID

	value := model.DailyTrackerValue{}
	if err := r.DB.Preload("Tracker").First(&value, id).Error; err != nil {
		if gorm.IsRecordNotFoundError(err) {
			return nil, fmt.Errorf("tracker value not found")
		}
		return nil, err
	}

	// Verify ownership
	if value.Tracker.UserID != userID {
		return nil, fmt.Errorf("access denied")
	}

	// Convert before deleting
	result := convert.ToExternalValue(value)

	if err := r.DB.Delete(&value).Error; err != nil {
		return nil, err
	}

	return result, nil
}
