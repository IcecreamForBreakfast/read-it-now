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

## User Preferences

Preferred communication style: Simple, everyday language.

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