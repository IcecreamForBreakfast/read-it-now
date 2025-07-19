# Design Considerations for Unified Notes App

## Core Design Principles

### 1. Progressive Workflow
- **Inbox**: Triage new content (articles from iOS, manual notes)
- **Saved**: Reference material worth keeping
- **Archived**: Completed/read items for history

### 2. Content Type Flexibility
- **Articles**: URL-based with auto-extracted content
- **Manual Notes**: User-created content without URLs
- **Annotations**: Personal notes on any content type

### 3. Backward Compatibility
- Existing users see familiar interface
- Articles seamlessly appear in "Saved" state
- iOS shortcuts continue working (enhanced with inbox flow)

## Key UI Decisions

### State Management
**Visual Indicators:**
- 📥 Inbox (new items requiring action)
- 💾 Saved (reference material) 
- 🗂️ Archived (completed items)
- 📌 Has annotations
- 🔗 Article with URL
- 📝 Manual note

**Interaction Patterns:**
- Quick actions: Save, Archive, Delete
- Bulk operations: "Archive all read", "Delete selected"
- Drag and drop (where applicable)

### Information Architecture
**Primary Navigation:**
- State-based (Inbox/Saved/Archived)
- Tag-based filtering (work, personal, uncertain)
- Search across all content

**Secondary Features:**
- Annotation editing
- Manual note creation
- URL article saving
- Tag management

### Mobile-First Considerations
**Touch Interactions:**
- Swipe gestures for quick state changes
- Long press for bulk selection
- Pull to refresh for new content

**Screen Real Estate:**
- Collapsible content previews
- Floating action button for new notes
- Bottom navigation for primary actions

## Data Display Strategy

### Content Preview
**Article Cards:**
- Title (auto-extracted or manual)
- Domain/source (for articles)
- Content preview (first 2 lines)
- Metadata: tag, state, timestamp

**Annotation Handling:**
- Inline preview with "..." expansion
- Dedicated annotation editing modal
- Clear visual distinction from content

### Filtering & Search
**Smart Filters:**
- Combined state + tag filtering
- Recent activity (last 24h, week, month)
- Content type (articles vs manual notes)

**Search Features:**
- Full-text search across titles and content
- Tag-based search
- Date-range filtering

## Performance Considerations

### Lazy Loading
- Load 20-50 items initially
- Infinite scroll or pagination
- Prefetch next batch in background

### Caching Strategy
- Cache recently viewed notes
- Optimistic updates for state changes
- Offline support for manual notes

### Real-time Updates
- Instant feedback for state transitions
- Background sync for iOS-created articles
- Toast notifications for successful operations

## Accessibility Features

### Screen Reader Support
- Clear heading hierarchy
- Descriptive button labels
- State announcements for changes

### Keyboard Navigation
- Tab order through cards and actions
- Keyboard shortcuts for power users
- Focus management for modals

### Visual Accessibility
- High contrast mode support
- Scalable text sizes
- Clear visual state indicators

This foundation ensures the unified Notes app feels both powerful and approachable while maintaining the clean, focused experience users expect from the Read-It-Now platform.