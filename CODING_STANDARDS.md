# Coding Standards

## General Principles
- Write clean, readable code with clear variable names
- Keep functions small and focused on single responsibilities
- Use TypeScript types consistently throughout the codebase
- Follow existing patterns in the project

## Frontend Standards
- Use React hooks and functional components
- Implement proper error boundaries and loading states
- Follow the established folder structure in client/src/
- Use TanStack Query for all server state management

## Backend Standards
- Keep route handlers thin - business logic goes in storage layer
- Always validate request bodies with Zod schemas
- Use proper HTTP status codes and error messages
- Log errors with context for debugging

## Database Standards
- Use Drizzle ORM for all database operations
- Never write raw SQL migrations - use npm run db:push
- Maintain referential integrity with proper foreign keys
- Handle null values explicitly to prevent constraint violations

## Testing Standards
- Write tests for critical business logic
- Focus on integration tests over unit tests
- Test authentication flows thoroughly
- Verify database constraint handling