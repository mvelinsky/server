package model

import (
	"database/sql/driver"
	"fmt"
)

// DailyTracker defines a daily tracker with type-safe value storage
type DailyTracker struct {
	ID        int        `gorm:"primary_key;unique_index;AUTO_INCREMENT"`
	UserID    int        `gorm:"type:int REFERENCES users(id) ON DELETE CASCADE"`
	Name      string
	Type      TrackerType
	Chainable bool // Enables streak tracking
	Color     string
}

// TrackerType represents the value type (text/number/boolean)
type TrackerType string

// Value for db
func (t TrackerType) Value() (driver.Value, error) {
	return string(t), nil
}

// Scan for db
func (t *TrackerType) Scan(value interface{}) error {
	s, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("expected string but was %#v", value)
	}
	*t = TrackerType(s)
	return nil
}

// TrackerType constants
const (
	TypeText     TrackerType = "text"
	TypeNumber   TrackerType = "number"
	TypeBoolean  TrackerType = "boolean"
)

// DailyTrackerValue stores a single day's tracker entry with type-safe columns
type DailyTrackerValue struct {
	ID          int    `gorm:"primary_key;unique_index;AUTO_INCREMENT"`
	TrackerID   int    `gorm:"type:int REFERENCES daily_trackers(id) ON DELETE CASCADE"`
	Date        string // Format: YYYY-MM-DD (user's timezone date)

	// Type-safe value columns (only one is used based on tracker type)
	TextValue   string  `gorm:"type:text"`
	NumberValue float64 `gorm:"type:float"`
	BoolValue   bool    `gorm:"type:boolean"`

	CreatedAt   Time
	UpdatedAt   Time

	// Relationship
	Tracker     DailyTracker `gorm:"foreignkey:TrackerID"`
}
