package dailytracker

import (
	"context"
	"fmt"
	"time"

	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
	"github.com/traggo/server/dailytracker/convert"
)

// RemoveDailyTracker removes a daily tracker.
func (r *ResolverForDailyTracker) RemoveDailyTracker(ctx context.Context, id int) (*gqlmodel.DailyTracker, error) {
	userID := auth.GetUser(ctx).ID

	tracker := model.DailyTracker{}
	if r.DB.Where("id = ? AND user_id = ?", id, userID).Find(&tracker).RecordNotFound() {
		return nil, fmt.Errorf("tracker with id '%d' does not exist", id)
	}

	// Cascade delete will handle DailyTrackerValue entries
	if err := r.DB.Delete(&tracker).Error; err != nil {
		return nil, err
	}

	return convert.ToExternalTracker(tracker, r.DB, time.Now())
}
