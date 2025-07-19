# Unified Notes API Reference

## Overview
The Unified Notes App extends the original Read-It-Later functionality with a comprehensive note management system supporting both URL-based articles and manual notes.

## Core Concepts

### Note States
- **inbox**: New items requiring review/action
- **saved**: Reference-worthy items for future use
- **archived**: Completed/read items stored for history

### Note Types
- **URL-based**: Articles saved from websites (automatic content extraction)
- **Manual**: User-created notes with custom content

## API Endpoints

### Authentication
All endpoints require authentication via session cookies (except token-based saving).

### Notes API (`/api/notes`)

#### Get All Notes
```http
GET /api/notes?tag=work&state=inbox
```
**Query Parameters:**
- `tag` (optional): Filter by tag (work, personal, uncertain, untagged)
- `state` (optional): Filter by state (inbox, saved, archived)

#### Get Single Note
```http
GET /api/notes/:id
```

#### Create Note
```http
POST /api/notes
Content-Type: application/json

{
  "title": "Meeting Notes",
  "content": "Discussion about project timeline...",
  "url": "https://example.com/article",  // optional
  "annotation": "Important for quarterly review",  // optional
  "tag": "work",  // optional, defaults to auto-tag for URLs
  "state": "inbox"  // optional, defaults to inbox
}
```

#### Update Note State
```http
PATCH /api/notes/:id/state
Content-Type: application/json

{
  "state": "saved"  // inbox | saved | archived
}
```

#### Update Note Annotation
```http
PATCH /api/notes/:id/annotation
Content-Type: application/json

{
  "annotation": "Updated thoughts on this article..."
}
```

#### Update Note Tag
```http
PATCH /api/notes/:id/tag
Content-Type: application/json

{
  "tag": "personal"  // work | personal | uncertain | untagged
}
```

#### Delete Note
```http
DELETE /api/notes/:id
```

### Legacy Articles API (`/api/articles`)
All existing endpoints preserved for backward compatibility:
- `GET /api/articles` - Maps to saved notes
- `GET /api/articles/:id` - Individual article access
- `POST /api/articles` - Create article (saved state)
- `DELETE /api/articles/:id` - Delete article
- `PATCH /api/articles/:id/tag` - Update article tag

### iOS Integration
```http
POST /api/save/:token
Content-Type: application/json

{
  "url": "https://example.com/article"
}
```
**Behavior:** Creates note in "inbox" state with auto-tagging

## Response Format

### Note Object
```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "title": "Article Title",
  "url": "https://example.com",  // null for manual notes
  "domain": "example.com",       // null for manual notes
  "content": "Article content...",
  "annotation": "User notes...", // null if no annotation
  "tag": "work",
  "state": "inbox",
  "createdAt": "2025-01-19T12:00:00Z",
  "updatedAt": "2025-01-19T12:30:00Z"
}
```

## Workflow Examples

### Typical Note Lifecycle
1. **Capture**: URL saved via iOS shortcut → `inbox` state
2. **Review**: User reads and adds annotation
3. **Organize**: Move to `saved` for reference or `archived` when done
4. **Tag**: Automatic or manual categorization

### Manual Note Creation
```http
POST /api/notes
{
  "title": "Meeting Action Items",
  "content": "1. Review budget\n2. Schedule follow-up\n3. Update timeline",
  "state": "inbox",
  "tag": "work"
}
```

### URL Article Processing
```http
POST /api/notes
{
  "url": "https://techcrunch.com/article",
  "annotation": "Interesting perspective on AI trends"
}
```
**Result**: Automatic title/content extraction, domain parsing, auto-tagging, and inbox placement.

## Migration Strategy
- Existing articles automatically map to "saved" state
- All `/api/articles` endpoints continue working
- New Notes API provides extended functionality
- Gradual migration path for frontend components