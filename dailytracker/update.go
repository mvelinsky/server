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

// UpdateDailyTracker updates a daily tracker.
func (r *ResolverForDailyTracker) UpdateDailyTracker(ctx context.Context, id int, name *string, trackerType *gqlmodel.TrackerType, chainable *bool, color *string) (*gqlmodel.DailyTracker, error) {
	userID := auth.GetUser(ctx).ID

	tracker := model.DailyTracker{}
	if r.DB.Where("id = ? AND user_id = ?", id, userID).Find(&tracker).RecordNotFound() {
		return nil, fmt.Errorf("tracker with id '%d' does not exist", id)
	}

	updates := map[string]interface{}{}

	if name != nil {
		if strings.TrimSpace(*name) == "" {
			return nil, fmt.Errorf("tracker name must not be empty")
		}
		// Check for duplicate names if name is changing
		if tracker.Name != *name {
			existing := model.DailyTracker{}
			if !r.DB.Where("user_id = ? AND name = ? AND id != ?", userID, *name, id).Find(&existing).RecordNotFound() {
				return nil, fmt.Errorf("tracker with name '%s' already exists", *name)
			}
		}
		updates["name"] = *name
	}

	if trackerType != nil {
		updates["type"] = convertInternalTrackerType(*trackerType)
	}

	if chainable != nil {
		updates["chainable"] = *chainable
	}

	if color != nil {
		updates["color"] = *color
	}

	if err := r.DB.Model(&tracker).Updates(updates).Error; err != nil {
		return nil, err
	}

	// Reload to get updated values
	if err := r.DB.Where("id = ?", id).Find(&tracker).Error; err != nil {
		return nil, err
	}

	return convert.ToExternalTracker(tracker, r.DB, time.Now())
}
