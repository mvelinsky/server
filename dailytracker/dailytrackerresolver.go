package dailytracker

import "github.com/jinzhu/gorm"

// ResolverForDailyTracker resolves daily tracker specific things.
type ResolverForDailyTracker struct {
	DB *gorm.DB
}
