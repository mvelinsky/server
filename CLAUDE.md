# Traggo - Time Tracking Application

A self-hosted time tracking application with a GraphQL backend and React frontend.

## Project Structure

```
server/
├── ui/              # Frontend (React + TypeScript + Material-UI)
├── model/           # Database models (Go GORM)
├── graphql/         # GraphQL resolvers
├── dashboard/       # Dashboard functionality
├── timespan/        # Time tracking core logic
├── auth/            # Authentication
├── tag/             # Tag management
├── user/            # User management
├── schema.graphql   # GraphQL schema
└── main.go          # Backend entry point
```

## Development Setup

### Backend (Go)

```bash
# Install gqlgen if not already installed
go install github.com/99designs/gqlgen@v0.17.44

# Run backend
go run main.go
```

The backend runs on port **3030** by default.

### Frontend (React)

```bash
cd ui

# Install dependencies
yarn install

# Generate GraphQL types
yarn generate

# Start development server
NODE_OPTIONS=--openssl-legacy-provider yarn start
```

The frontend runs on port **3000** and proxies API calls to port **3030**.

### Building for Production

```bash
# Generate GraphQL types (backend)
export PATH=$PATH:$(go env GOPATH)/bin
gqlgen

# Build frontend (important to run in ui directory, not in repository root)
cd ui
NODE_OPTIONS=--openssl-legacy-provider yarn build

# The UI is embedded in the Go binary via go:embed
```

## Key Technologies

- **Backend**: Go, GORM, GraphQL (gqlgen), SQLite
- **Frontend**: React, TypeScript, Material-UI, Apollo Client, FullCalendar
- **Database**: SQLite (development)

## Database Schema

### Key Models

- **User**: Admin/user accounts
- **TimeSpan**: Time tracking records with start/end times, tags, and notes
- **TagDefinition**: Tag keys with colors
- **Dashboard**: User-created dashboards
- **DashboardEntry**: Chart widgets (PieChart, BarChart, LineChart, Tables)
- **DashboardRange**: Named date ranges for dashboards

## Adding New Features

### Adding a Database Field

1. Update the model in `model/*.go`
2. Update `schema.graphql` type and mutations
3. Update conversion logic in `dashboard/convert/*.go`
4. Update add/update logic in `dashboard/entry/*.go`
5. Regenerate GraphQL types: `gqlgen` (backend), `yarn generate` (frontend)
6. Update frontend components

### GraphQL Schema Changes

After modifying `schema.graphql`:

```bash
# Backend
gqlgen

# Frontend
cd ui && yarn generate
```

## Frontend Patterns

### Time Spans

- **Calendar View**: `ui/src/timespan/calendar/CalendarPage.tsx`
- **List View**: `ui/src/timespan/DoneTrackers.tsx`
- **Time Span Component**: `ui/src/timespan/TimeSpan.tsx`

Time spans have:
- Tags (key:value pairs)
- Notes/descriptions (free text)
- Start/end times

### Dashboards

- **Entry Types**: PieChart, BarChart, StackedBarChart, LineChart, VerticalTable, HorizontalTable
- **Entry Properties**: title, description, tags, interval, range, total display
- **Positioning**: Responsive (mobile/desktop)

### Tag Colors

Tags have associated colors used throughout the UI:
- Calendar event backgrounds
- Chip badges in lists
- Dashboard chart colors

## Important Notes

### Optional Chaining

This project uses older React/Webpack that doesn't support optional chaining (`?.`) by default. Use traditional condition checking instead.

```typescript
// Don't use
const color = tagDef?.color || 'fallback';

// Use instead
const color = (tagDef && tagDef.color) || 'fallback';
```

### TypeScript Types

GraphQL types are auto-generated in `ui/src/gql/__generated__/`. Don't edit these manually.

### Date/Time Handling

Uses `moment-timezone` for all date operations. User timezone is respected throughout.

## Default Credentials

- Username: `admin`
- Password: `admin`

## File Locations

| Purpose | Location |
|---------|----------|
| GraphQL Schema | `schema.graphql` |
| Database Models | `model/*.go` |
| GraphQL Resolvers | `graphql/*.go` |
| Dashboard Components | `ui/src/dashboard/` |
| Time Span Components | `ui/src/timespan/` |
| GraphQL Queries | `ui/src/gql/*.ts` |
| Generated Types | `ui/src/gql/__generated__/` |
