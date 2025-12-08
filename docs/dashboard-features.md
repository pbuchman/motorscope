# Dashboard Features

This document describes the Dashboard features in MotorScope.

## Overview

The Dashboard provides a comprehensive view of all tracked car listings with filtering, sorting, and multiple view modes.

## Features

### 1. View Modes

#### Grid View (Default)
- Shows full car cards with images, details, and price chart
- Best for detailed analysis
- 1-3 columns depending on screen width

#### Compact View
- List-style display without price charts
- Shows: thumbnail, title, key specs, current/previous price
- More listings visible at once
- Best for quick scanning and comparison

**Toggle**: Use the grid/list icons in the header to switch views.

### 2. Filtering

#### Status Filter
- **All**: Show all listings
- **Active**: Only currently active listings
- **Sold**: Only sold listings
- **Expired**: Only expired/removed listings

#### Archive Filter
- **Active only** (default): Hide archived listings
- **Archived only**: Show only archived listings
- **All**: Show both archived and non-archived

#### Make Filter (Multi-select)
- Dynamically populated with makes from your listings
- Select multiple makes to filter
- Click to open dropdown with checkboxes
- "Select all" and "Clear" buttons for quick actions

#### Model Filter (Multi-select)
- Dynamically populated based on selected makes
- If no makes selected, shows all models
- If makes selected, shows only models from those makes
- Select multiple models to filter
- Models are automatically cleared if their make is deselected

#### Source Filter (Multi-select)
- Filters by marketplace/source (e.g., OTOMOTO, Autoplac)
- Only shows sources that have at least one listing
- Sources are populated from the marketplace configuration
- Appears only when listings from multiple sources exist

### 3. Sorting

Available sort options:
- **Newest first** (default): By tracking start date, newest first
- **Oldest first**: By tracking start date, oldest first
- **Price: Low to High**: Ascending price order
- **Price: High to Low**: Descending price order
- **Name A-Z**: Alphabetical by title

### 4. Archive Feature

Archived listings are:
- **Excluded from auto-refresh**: Won't be updated during scheduled refreshes
- **Still manually refreshable**: Can refresh individually when needed
- **Visually distinguished**: Shown with amber border and "Archived" badge
- **Filterable**: Can show/hide using the archive filter

**Use cases**:
- Listings you want to keep for reference but don't need updates
- Completed purchases you want in history
- Expired listings you want to retain

**Actions**:
- Click the archive icon to archive/unarchive
- Archived listings show "Unarchive" icon instead

### 5. Final Price Display

For listings with status SOLD or EXPIRED:
- Shows "Final Price" badge
- Price change indicators (↓ Drop / ↑ Rise) are hidden
- Helps track what price cars actually sold for

## UI Components

### Header
- Search box (searches title, make, model, VIN, phone)
- View mode toggle (grid/list)
- User info and logout
- Settings link

### Filter Bar
- Status dropdown
- Archive filter dropdown
- Make dropdown (if multiple makes)
- Sort dropdown
- Active filter badges with quick-remove
- Clear filters button

### Listing Cards

#### Full Card (Grid View)
- Large thumbnail
- Status badge
- Price with change indicators
- Vehicle specs grid (year, mileage, fuel)
- Tags (VIN, phone, engine, location, etc.)
- Tracking info
- Price history chart
- Action buttons (open, refresh, archive, delete)

#### Compact Card (List View)
- Small thumbnail
- Title (truncated)
- Key specs inline
- Status badge
- Current price with change %
- Previous price (if changed)
- Action buttons (open, refresh, archive, delete)

## Data Flow

```
User interacts with filters/sort
        ↓
filteredAndSortedListings (memoized)
        ↓
    Renders listings
        ↓
Actions (archive, refresh, delete)
        ↓
    update/refresh/remove
        ↓
    Backend API call
        ↓
    Reload listings
```

## State Management

### Filter/Sort Persistence
Filters, sort order, and view mode are **persisted to the backend API**:
- Saved automatically with 1-second debounce
- Restored when user logs in
- Synced across devices

### Local State
- Search term is local (not persisted)
- Refreshing state is local

Archive status is persisted:
- Stored with listing in backend
- Survives page refresh and logout

## Files

- `components/Dashboard.tsx` - Main dashboard component
- `components/CarCard.tsx` - Full card component (grid view)
- `components/CarCardCompact.tsx` - Compact card component (list view)
- `components/DashboardFilters.tsx` - Filter/sort controls
- `components/PriceChart.tsx` - Price history chart

## Type Definitions

```typescript
// View mode
type ViewMode = 'grid' | 'compact';

// Filter state
interface FilterState {
  status: ListingStatus | 'all';
  archived: 'all' | 'active' | 'archived';
  makes: string[];   // Multi-select makes
  models: string[];  // Multi-select models
  sources: string[]; // Multi-select sources (marketplace IDs)
}

// Make/Model option for filter dropdown
interface MakeModelOption {
  make: string;
  models: string[];
}

// Sort options
type SortOption = 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'name';

// Listing (extended)
interface CarListing {
  // ... existing fields
  isArchived?: boolean;  // Archive status
}

// Dashboard preferences (persisted to API)
interface DashboardPreferences {
  filters: FilterState;
  sortBy: SortOption;
  viewMode: ViewMode;
}
```

## Best Practices

1. **Use filters to focus**: When monitoring many cars, filter by status
2. **Archive sold/expired**: Keep history clean while retaining data
3. **Compact view for scanning**: Quick price comparison across many listings
4. **Grid view for analysis**: Detailed view with price charts

