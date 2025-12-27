package dailytracker

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
	"github.com/traggo/server/dailytracker/convert"
)

func convertInternalTrackerType(t gqlmodel.TrackerType) model.TrackerType {
	switch t {
	case gqlmodel.TrackerTypeText:
		return model.TypeText
	case gqlmodel.TrackerTypeNumber:
		return model.TypeNumber
	case gqlmodel.TrackerTypeBoolean:
		return model.TypeBoolean
	default:
		return model.TypeText
	}
}

// CreateDailyTracker creates a daily tracker.
func (r *ResolverForDailyTracker) CreateDailyTracker(ctx context.Context, name string, trackerType gqlmodel.TrackerType, chainable bool, color string) (*gqlmodel.DailyTracker, error) {
	if strings.TrimSpace(name) == "" {
		return nil, fmt.Errorf("tracker name must not be empty")
	}

	userID := auth.GetUser(ctx).ID

	// Check for duplicate names per user
	existing := model.DailyTracker{}
	if !r.DB.Where("user_id = ? AND name = ?", userID, name).Find(&existing).RecordNotFound() {
		return nil, fmt.Errorf("tracker with name '%s' already exists", name)
	}

	tracker := &model.DailyTracker{
		Name:      name,
		Type:      convertInternalTrackerType(trackerType),
		Chainable: chainable,
		Color:     color,
		UserID:    userID,
	}

	if err := r.DB.Create(&tracker).Error; err != nil {
		return nil, err
	}

	return convert.ToExternalTracker(*tracker, r.DB, time.Now())
}
