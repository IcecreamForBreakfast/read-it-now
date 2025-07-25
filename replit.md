# replit.md

## Overview

This is a personal read-it-later application built as a Pocket replacement. It's a full-stack web application that allows users to save articles from iOS and desktop browsers, view them in a clean reader interface, and organize them with tags. The application is designed for single-user use with authentication to sync articles across devices.

## Recent Changes

**January 2025:**
- ✅ Fixed critical session authentication issue - sessions now persist properly across requests
- ✅ Improved article content parsing with proper paragraph formatting
- ✅ Enhanced error handling for blocked websites with user-friendly messages
- ✅ Reader view now displays articles with proper line breaks and typography
- ✅ All core functionality working: user registration, login, article saving, and reading
- ✅ **iOS Sharing Integration Complete**: Personal token system for seamless article saving
- ✅ **Token Management UI**: Dashboard component with copy buttons for easy setup
- ✅ **Flexible URL Validation**: Handles various URL formats from iOS shortcuts
- ✅ **Production Ready**: iOS shortcut successfully tested and saving articles
- ✅ **Uptime Monitoring**: UptimeRobot configured to keep app awake for reliable iOS shortcut performance
- ✅ **Optimistic Delete Operations**: Fixed delete functionality with instant UI updates and graceful 404 handling
- ✅ **Professional UX**: Smooth article management with proper error handling and success feedback
- ✅ **Render Deployment Setup**: Switched from Vercel to Render for reliable production deployment
- ✅ **Health Check Endpoint**: Added `/api/health` for monitoring and keeping app awake
- ✅ **Deployment Cleanup**: Removed Vercel configuration files and added Render setup
- ✅ **Production Deployment Success**: App fully functional at https://read-it-now.onrender.com/
- ✅ **Session Authentication Fixed**: Resolved cookie security issues for persistent login
- ✅ **Comprehensive Debugging**: Added session monitoring for production troubleshooting
- ✅ **Password Change Feature**: Secure password update with current password validation and 8+ character requirement
- ✅ **iOS Token Management Reorganized**: Moved token display and regeneration to "How To Save" modal with safety warnings
- ✅ **Cleaner Dashboard Interface**: Removed token management clutter, added collapsible password change at bottom
- ✅ **Auto-Tagging System Implemented**: Rule-based intelligent tagging of articles as "work", "personal", or "uncertain"
- ✅ **Analytics Dashboard**: Shows tag distribution, performance metrics, and smart rule suggestions
- ✅ **Auto-Tagging Successfully Tested**: System correctly categorized articles with work/uncertain tags
- ✅ **Manual Tag Editing**: Fixed missing PATCH endpoint - users can now click edit icon to manually correct tags
- ✅ **Batch Retagging**: Added "Retag existing untagged articles" feature to process historical articles
- ✅ **Enhanced Auto-Tagging Rules**: Expanded keyword/domain recognition to reduce "uncertain" classifications
- ✅ **Complete Tagging Workflow**: Both automatic and manual tagging working seamlessly with real-time analytics updates
- ✅ **Jest Testing Infrastructure**: Successfully implemented comprehensive test suite with working authentication tests
- ✅ **Phase 1 Testing Complete**: Session authentication tests passing - covering historical bug patterns
- ✅ **iOS Integration Tests**: Token-based article saving tested with user isolation and high-frequency scenarios
- ✅ **API Contract Tests**: All endpoints tested with proper authorization and error handling
- ✅ **Automated Testing Pipeline**: Pre-commit hooks and GitHub Actions prevent broken code from reaching production
- ✅ **Production Auth Bug Fixed**: Password reset resolved login issue - tests now include production data validation
- ✅ **Dual Product Strategy**: Branch-based approach for Read-It-Now (stable) and Unified Notes App (development)
- ✅ **Phase 1 Complete**: Data model migration ready - articles→notes schema with backward compatibility
- ✅ **Phase 2 Complete**: Notes API endpoints implemented with state management and annotation support
- ✅ **Migration Successful**: 17 articles migrated to unified notes schema with full backward compatibility
- ✅ **API Testing Complete**: All endpoints functional - manual notes, state transitions, annotations working
- ✅ **UI Cleanup Complete**: Removed redundant "How to Save" button, updated help modal with accurate iOS shortcut instructions  
- ✅ **iOS Token Management**: Reorganized behind collapsible drawer with complete 12-step setup guide
- ✅ **Backend Debugging Complete**: Fixed schema compatibility issues between Article and Notes formats
- ✅ **Articles Endpoint Working**: All 500 errors resolved, data retrieval functional for both user accounts
- ✅ **Phase 3 Complete Ahead of Schedule**: Detail view with full annotation editing implemented before Phase 2 cards
- ✅ **Reference Detail Page**: Complete reading experience with annotation editing, share/delete, and proper navigation
- ✅ **Smart Routing**: Saved articles open in detail view, inbox articles continue using standard reader
- ✅ **API Integration**: Connected to existing Notes endpoints for seamless annotation management and state transitions
- ✅ **Inbox Detail View Fixed**: Migrated reader page to unified Notes API, resolved broken inbox article viewing
- ✅ **Complete API Migration**: All frontend components now use unified Notes endpoints consistently
- ✅ **Database Migration Complete**: 26 articles migrated to Notes table - iOS shortcut now works with both environments

## User Preferences

Preferred communication style: Simple, everyday language.

## Next Session Reminders
- ✅ Git repository updated - all latest code pushed to GitHub
- ✅ Render deployment configuration complete - ready for production deployment
- ✅ **Render deployment successful** - App fully functional at https://read-it-now.onrender.com/
- ✅ **Session authentication fixed** - Login persists across page refreshes
- ✅ **Article management working** - All 15 articles accessible and manageable
- ✅ **Password change and iOS token management** - Both features implemented and tested
- Update iOS shortcut with new URL: `/api/save/f48bc9f7830a09f4cb6b5bee33b31a15c2c65b2b24059eaf`
- Configure UptimeRobot monitoring for health check endpoint
- **Ready for production deployment** - Push latest changes to GitHub and deploy to Render

## Future Features Todo List
- AI-generated short descriptions for each article
- Extract and display original article publication date when available
- **Big Idea**: Consider merging with Evernote clone - after archiving articles, option to save for future reference in note-taking system

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Session Management**: Express sessions with cookie-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Article Processing**: Custom article parser using JSDOM for content extraction

### Database Layer
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured for Neon Database)
- **Schema**: Two main tables - users and articles with proper foreign key relationships

## Key Components

### Authentication System
- Email/password authentication with session-based login
- Password hashing using bcrypt
- Protected routes requiring authentication
- Session persistence across browser sessions

### Article Management
- URL-based article saving
- Automatic metadata extraction (title, domain, content)
- Tag-based organization system
- Clean reader view for distraction-free reading

### User Interface
- Responsive design optimized for mobile and desktop
- Card-based article listing with filtering
- Modal dialogs for article saving and instructions
- Toast notifications for user feedback

## Data Flow

1. **Article Saving**: User submits URL → Server fetches content → Extracts metadata → Saves to database
2. **Article Listing**: Client requests articles → Server filters by user/tag → Returns formatted data
3. **Reader View**: User clicks article → Server returns full content → Displays in clean interface
4. **Tag Management**: User updates tags → Server validates and saves → Client refreshes data

## External Dependencies

### Frontend Dependencies
- React ecosystem (React, React DOM, React Router via Wouter)
- TanStack Query for data fetching
- Radix UI components for accessible UI elements
- Tailwind CSS for styling
- Date-fns for date formatting
- Lucide React for icons

### Backend Dependencies
- Express.js for server framework
- Drizzle ORM for database operations
- JSDOM for HTML parsing
- bcrypt for password hashing
- Express-session for session management
- Neon Database serverless driver

### Development Dependencies
- Vite for build tooling
- TypeScript for type safety
- ESBuild for production builds
- Replit-specific plugins for development environment

## Deployment Strategy

### Development
- Vite dev server for frontend with hot module replacement
- Express server with TypeScript compilation via tsx
- Environment variables for database connection
- Replit-specific development tools integration

### Production
- Vite build process generates optimized static assets
- ESBuild bundles server code for Node.js execution
- Static file serving through Express
- Session-based authentication with secure cookies
- Database migrations through Drizzle Kit

### Key Configuration Files
- `vite.config.ts`: Frontend build configuration with path aliases
- `drizzle.config.ts`: Database configuration and migration settings
- `tsconfig.json`: TypeScript compiler options with path mapping
- `tailwind.config.ts`: Styling configuration with custom theme

The application follows a monorepo structure with clearly separated client, server, and shared code, making it easy to maintain and extend while keeping type safety across the full stack.