# iOS Sharing Setup Guide

This guide shows how to save articles from iOS Safari and Chrome directly to your Read-It-Later app.

## Method 1: Safari Share Extension (Recommended)

### Step 1: Create iOS Shortcut
1. Open the **Shortcuts** app on your iPhone
2. Tap the **+** button to create a new shortcut
3. Search for and add **"Get URLs from Input"**
4. Search for and add **"Get Contents of URL"**
5. Configure the Get Contents of URL action:
   - **URL**: Use the URL from previous action
   - **Method**: POST
   - **Headers**: 
     - `Content-Type`: `application/json`
     - `Cookie`: `connect.sid=YOUR_SESSION_COOKIE` (see below)
   - **Request Body**: JSON
   ```json
   {
     "url": "URL_FROM_PREVIOUS_ACTION"
   }
   ```
6. Set the shortcut name to "Save to Reader"
7. In Settings, enable "Use with Share Sheet"

### Step 2: Get Your Session Cookie
1. Log in to your app in Safari
2. Open Safari Developer Tools (if on desktop) or use the Web Inspector
3. Go to Application/Storage → Cookies
4. Copy the `connect.sid` cookie value
5. Paste it into the shortcut's Cookie header

### Step 3: Update API Endpoint
Replace `YOUR_DOMAIN` in the shortcut with your actual app URL:
```
https://YOUR_DOMAIN/api/articles
```

## Method 2: Bookmarklet (Works in any browser)

### Step 1: Create Bookmarklet
1. Copy this JavaScript code:
```javascript
javascript:(function(){
  var url = encodeURIComponent(window.location.href);
  var title = encodeURIComponent(document.title);
  var saveUrl = 'https://YOUR_DOMAIN/dashboard?save=' + url;
  window.open(saveUrl, '_blank');
})();
```

2. Replace `YOUR_DOMAIN` with your actual app domain
3. Save this as a bookmark in Safari with the name "Save Article"

### Step 2: Usage
1. When reading an article, tap the bookmark
2. It will open your app with the article URL pre-filled
3. You can review and save the article

## Method 3: Manual URL Sharing

### For any app or browser:
1. Copy the article URL
2. Open your Read-It-Later app
3. Paste the URL in the save dialog
4. Tap Save

## Production Setup Notes

When deploying to production:
1. Update all URLs to use your production domain
2. Ensure HTTPS is enabled for secure cookies
3. Consider using a more permanent authentication method than session cookies
4. Test the sharing workflow thoroughly on your actual iOS device

## Troubleshooting

**Shortcut not working:**
- Check that the session cookie is valid and not expired
- Verify the API endpoint URL is correct
- Ensure you're logged in to the web app

**Bookmarklet not working:**
- Check that JavaScript is enabled in your browser
- Verify the domain URL is correct
- Some browsers may block popup windows

**Articles not saving:**
- Check that you're logged in to the app
- Verify the URL is valid and accessible
- Some websites may block content extraction (this is normal)