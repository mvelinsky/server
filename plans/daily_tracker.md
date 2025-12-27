Daily Trackers Feature - Implementation Plan

     Overview

     Add a "daily trackers" feature to Traggo for tracking daily habits/metrics (text, number, or boolean values) with gamification (streaks, milestones).

     User Decisions

     - Storage: Separate value columns (text_value, number_value, bool_value) for type safety
     - Gamification: Streak milestones with badges/notifications
     - Management: Separate Tracker management page (like TagPage)
     - Editing: Hybrid - inline for number/boolean, dialog for text

     ---
     Phase 1: Backend - Database Models

     Create model/dailytracker.go

     type DailyTracker struct {
         ID         int  `gorm:"primary_key;unique_index;AUTO_INCREMENT"`
         UserID     int  `gorm:"type:int REFERENCES users(id) ON DELETE CASCADE"`
         Name       string
         Type       TrackerType  // Text, Number, Boolean
         Chainable  bool         // Enables streak tracking
         Color      string
     }

     type DailyTrackerValue struct {
         ID          int  `gorm:"primary_key;unique_index;AUTO_INCREMENT"`
         TrackerID   int  `gorm:"type:int REFERENCES daily_trackers(id) ON DELETE CASCADE"`
         Date        string  // YYYY-MM-DD format
         TextValue   string  `gorm:"type:text"`
         NumberValue float64 `gorm:"type:float"`
         BoolValue   bool    `gorm:"type:boolean"`
         CreatedAt   Time
         UpdatedAt   Time
     }

     Update model/all.go

     Add new(DailyTracker) and new(DailyTrackerValue) to the All() function.

     ---
     Phase 2: Backend - GraphQL Schema

     Update schema.graphql

     Add enum and types:
     enum TrackerType {
         Text
         Number
         Boolean
     }

     type DailyTracker {
         id: Int!
         name: String!
         type: TrackerType!
         chainable: Boolean!
         color: String!
         streakDays: Int!
         milestoneBadges: [String!]!
     }

     type DailyTrackerValue {
         id: Int!
         trackerId: Int!
         tracker: DailyTracker!
         date: String!
         textValue: String
         numberValue: Float
         boolValue: Boolean
     }

     Add mutations and queries to RootMutation and RootQuery:
     # Mutations
     createDailyTracker(name: String!, type: TrackerType!, chainable: Boolean!, color: String!): DailyTracker @hasRole(role: USER)
     updateDailyTracker(id: Int!, name: String, type: TrackerType, chainable: Boolean, color: String): DailyTracker @hasRole(role: USER)
     removeDailyTracker(id: Int!): DailyTracker @hasRole(role: USER)
     setDailyTrackerValue(trackerId: Int!, date: String!, textValue: String, numberValue: Float, boolValue: Boolean): DailyTrackerValue @hasRole(role: USER)
     removeDailyTrackerValue(id: Int!): DailyTrackerValue @hasRole(role: USER)

     # Queries
     dailyTrackers: [DailyTracker!] @hasRole(role: USER)
     dailyTrackerValues(fromInclusive: String!, toInclusive: String!): [DailyTrackerValue!] @hasRole(role: USER)

     Run gqlgen to regenerate GraphQL types.

     ---
     Phase 3: Backend - Resolvers

     Create dailytracker/ directory structure

     dailytracker/
     ├── dailytrackerresolver.go    # Resolver struct with DB
     ├── create.go                   # createDailyTracker
     ├── update.go                   # updateDailyTracker
     ├── remove.go                   # removeDailyTracker
     ├── get.go                      # dailyTrackers query
     ├── value.go                    # setDailyTrackerValue, removeDailyTrackerValue
     ├── streak.go                   # CalculateStreak function
     └── convert/
         └── tracker.go              # Model to GraphQL conversion

     Key resolver patterns (follow tag/*.go structure):

     - Validate input (non-empty names, valid date format YYYY-MM-DD)
     - User isolation via auth.GetUser(ctx).ID
     - Check for duplicate names per user
     - Cascade delete handling
     - Transaction support for updates

     Streak calculation logic (streak.go):

     - Query all values for a tracker ordered by date DESC
     - Calculate consecutive days backwards from today
     - Milestone badges: [7, 14, 30, 60, 90, 100, 365] days

     Update graphql/resolver.go

     Add to resolver struct and NewResolver:
     ResolverForDailyTracker: dailytracker.ResolverForDailyTracker{DB: db},

     ---
     Phase 4: Frontend - GraphQL Queries

     Create ui/src/gql/dailyTracker.ts

     export const DailyTrackers = gql`...`;
     export const DailyTrackerValues = gql`...`;
     export const CreateDailyTracker = gql`...`;
     export const UpdateDailyTracker = gql`...`;
     export const RemoveDailyTracker = gql`...`;
     export const SetDailyTrackerValue = gql`...`;

     Run cd ui && yarn generate to generate types.

     ---
     Phase 5: Frontend - Management Page

     Create ui/src/dailytracker/DailyTrackerPage.tsx

     Similar to ui/src/tag/TagPage.tsx:
     - Material-UI Paper container
     - Table with columns: Name, Type, Chainable, Color, Streak, Actions
     - Inline editing for quick updates
     - Add button with dialog
     - Color picker (use existing SliderPicker from TagPage)
     - Delete with confirmation

     Add route to ui/src/Router.tsx:

     <Route exact path="/user/trackers" component={DailyTrackerPage} />

     Add menu item to ui/src/common/Page.tsx (in User section):

     <ListItem button component={routerLink('/user/trackers')}>
         <ListItemIcon><TrackChangesIcon /></ListItemIcon>
         <ListItemText primary="Daily Trackers" />
     </ListItem>

     Also add page title in Route Switch block.

     ---
     Phase 6: Frontend - Calendar Integration

     Create ui/src/dailytracker/DailyTrackerTable.tsx

     interface Props { dateRange: { start: moment.Moment; end: moment.Moment } }

     - Query DailyTrackerValues for date range
     - Table: rows = trackers, columns = days in range
     - First column: tracker name + streak badge
     - Date columns: editable cells
     - Material-UI Paper, Table, TableHead, TableBody

     Create ui/src/dailytracker/TrackerValueCell.tsx

     Hybrid editing:
     - Boolean: Checkbox for quick toggle (inline)
     - Number: TextField type="number" (inline)
     - Text: TextField that opens dialog on click (more space)

     Create ui/src/dailytracker/StreakBadge.tsx

     interface Props { streakDays: number; milestoneBadges: string[] }

     - Fire icon with color based on streak (Gold → Orange → Red-orange)
     - Display milestone badges as Chips
     - Fire colors: <7 gold, 7+ orange, 30+ dark orange, 100+ red-orange

     Update ui/src/timespan/calendar/CalendarPage.tsx

     1. Extract date range state to share with DailyTrackerTable:
     const [calendarRange, setCalendarRange] = React.useState<{
         start: moment.Moment;
         end: moment.Moment;
     }>({ start: moment().startOf('week'), end: moment().endOf('week') });

     2. Update datesRender callback to set shared state:
     datesRender={(x) => {
         const range = {start: moment(x.view.currentStart), end: moment(x.view.currentEnd)};
         setCalendarRange(range);
         // ... existing refetch logic
     }}

     3. Add DailyTrackerTable above FullCalendar:
     <Paper ...>
         <DailyTrackerTable dateRange={calendarRange} />
         <FullCalendarStyling>...</FullCalendarStyling>
     </Paper>

     ---
     Phase 7: Frontend - Gamification

     Create ui/src/dailytracker/MilestoneNotification.tsx

     - Query DailyTrackers on render
     - Check for new milestones using localStorage to avoid duplicates
     - Show snackbar notification for new milestones
     - Format: "Milestone reached: {tracker name} - {badge}!"

     ---
     Critical Files Reference

     | Purpose                        | Location                                  |
     |--------------------------------|-------------------------------------------|
     | Models (create)                | model/dailytracker.go                     |
     | Model registry (modify)        | model/all.go                              |
     | GraphQL schema (modify)        | schema.graphql                            |
     | Resolvers (create)             | dailytracker/*.go                         |
     | Resolver registration (modify) | graphql/resolver.go                       |
     | GraphQL queries (create)       | ui/src/gql/dailyTracker.ts                |
     | Management page (create)       | ui/src/dailytracker/DailyTrackerPage.tsx  |
     | Tracker table (create)         | ui/src/dailytracker/DailyTrackerTable.tsx |
     | Value cell (create)            | ui/src/dailytracker/TrackerValueCell.tsx  |
     | Streak badge (create)          | ui/src/dailytracker/StreakBadge.tsx       |
     | Calendar integration (modify)  | ui/src/timespan/calendar/CalendarPage.tsx |
     | Router (modify)                | ui/src/Router.tsx                         |
     | Navigation menu (modify)       | ui/src/common/Page.tsx                    |

     ---
     Implementation Order

     1. Backend models and GraphQL schema
     2. Backend resolvers (CRUD + streak calculation)
     3. Frontend GraphQL queries and type generation
     4. DailyTrackerPage (management UI)
     5. DailyTrackerTable and TrackerValueCell
     6. Calendar integration (date range sharing)
     7. Gamification (streak badges, notifications)
     8. Testing and polish