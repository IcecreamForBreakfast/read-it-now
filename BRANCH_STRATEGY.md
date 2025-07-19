# Branch Strategy for Dual Product Management

## Repository Structure

This repository now manages two separate products:

### 🔗 Read-It-Now (Original App)
- **Branch:** `main`
- **Purpose:** Simple, focused read-it-later functionality
- **Status:** Production-ready, stable
- **Deployment:** `read-it-now.onrender.com` (current production)
- **Features:**
  - URL saving and reading
  - iOS shortcut integration
  - Auto-tagging (work/personal/uncertain)
  - Clean reader interface

### 📝 Unified Notes App (Enhanced Version)
- **Branch:** `feature/unified-notes`
- **Purpose:** Comprehensive note-taking with articles, manual notes, and annotations
- **Status:** Development
- **Deployment:** `notes-app.onrender.com` (new product)
- **Features:**
  - All Read-It-Now functionality
  - Manual note creation
  - Inbox → Saved → Archived workflow
  - Enhanced search and filtering
  - User annotations
  - Reference management

## Deployment Configuration

### Read-It-Now (Production)
- Deploy from `main` branch
- Keep current Render deployment
- No changes to existing functionality
- iOS shortcut continues working unchanged

### Unified Notes App (New Product)
- Deploy from `feature/unified-notes` branch
- Create new Render deployment
- Use same database (different product views)
- New domain for user testing

## Development Workflow

### For Read-It-Now Maintenance
1. Work on `main` branch
2. Bug fixes and minor improvements only
3. Keep feature set stable
4. Deploy to production immediately

### For Unified Notes Development
1. Work on `feature/unified-notes` branch
2. Implement new features per phased plan
3. Test extensively before deployment
4. Deploy to staging environment first

### Cross-Product Bug Fixes
- Fix critical bugs on `main` first
- Cherry-pick to `feature/unified-notes`: `git cherry-pick <commit-hash>`
- Test on both deployments

## Benefits of This Approach

1. **Risk Mitigation:** Original app remains untouched and stable
2. **User Choice:** Existing users keep current functionality
3. **Innovation Space:** New features developed without pressure
4. **Easy Migration:** Shared database allows user data portability
5. **Sunset Strategy:** Can deprecate Read-It-Now if Notes App succeeds

## Next Steps

1. Create `feature/unified-notes` branch
2. Set up second Render deployment
3. Begin Phase 1 implementation (data model migration)
4. Test both apps work independently
5. Implement unified features systematically