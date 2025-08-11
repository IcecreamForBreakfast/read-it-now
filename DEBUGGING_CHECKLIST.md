# Debugging Checklist

## Before Making Changes
- [ ] Read the error message carefully and understand the root cause
- [ ] Check recent changes in git history that might be related
- [ ] Review relevant code files to understand current implementation
- [ ] Verify the issue exists in both development and production if applicable

## Database Issues
- [ ] Check for constraint violations (NOT NULL, foreign keys, unique)
- [ ] Verify data types match between TypeScript and database schema
- [ ] Test with both existing and new data scenarios
- [ ] Consider edge cases like null/undefined values

## API Issues
- [ ] Verify request/response formats match expected schemas
- [ ] Check authentication and session handling
- [ ] Test with different user accounts and permissions
- [ ] Validate input sanitization and error responses

## Frontend Issues  
- [ ] Check browser console for JavaScript errors
- [ ] Verify API calls are working correctly
- [ ] Test responsive design on different screen sizes
- [ ] Confirm loading and error states display properly

## After Making Changes
- [ ] Run LSP diagnostics to catch type errors
- [ ] Test the specific bug scenario that was reported
- [ ] Test related functionality that might be affected
- [ ] Update documentation if architectural changes were made

## Production Issues
- [ ] Check production logs for detailed error information
- [ ] Verify environment variables and secrets are configured
- [ ] Test with production data patterns and volumes
- [ ] Consider rollback if changes introduce new critical issues