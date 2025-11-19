# Environment Variables Setup

## ✅ No API Keys Required!

This portfolio uses **public GitHub API calls** which don't require authentication. Everything works perfectly on GitHub Pages without any environment variables or API keys!

## What Data is Fetched (Public API):

- ✅ User info (followers, following, public repos)
- ✅ Repository list with descriptions
- ✅ Stars and forks counts
- ✅ Programming languages
- ✅ Repository statistics
- ✅ All public GitHub data

## GitHub API Rate Limits:

- **Public API**: 60 requests/hour per IP (usually more than enough)
- **With Token**: 5,000 requests/hour (not needed for this portfolio)

## For GitHub Pages Deployment:

✅ **Works out of the box!** No configuration needed.

The portfolio automatically fetches all data from public GitHub API endpoints. Just deploy to GitHub Pages and it will work perfectly.

## If You Want to Use a Token (Optional):

If you ever need higher rate limits, you can optionally add a `.env` file:

1. Create `.env` in the root directory:
```
REACT_APP_GITHUB_TOKEN=your_token_here
```

2. Get a token from: https://github.com/settings/tokens
   - Only needs `public_repo` scope (or no scope for read-only)

3. Make sure `.env` is in `.gitignore` (it should be already)

**Note**: This is completely optional - the portfolio works perfectly without it!





