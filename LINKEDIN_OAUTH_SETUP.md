# LinkedIn OAuth Setup Guide

## Current Implementation
The LinkedIn section currently shows:
- Profile link
- Basic connection count (manual)
- Visit profile button

## To Add Full LinkedIn OAuth Integration:

### Step 1: Create LinkedIn App
1. Go to https://www.linkedin.com/developers/apps
2. Create a new app
3. Get your Client ID and Client Secret

### Step 2: Set Up OAuth
1. Add redirect URL: `http://localhost:3000/auth/linkedin/callback`
2. Request permissions: `r_liteprofile`, `r_emailaddress`

### Step 3: Install Dependencies
```bash
npm install react-linkedin-login-oauth2
# or
npm install @react-oauth/linkedin
```

### Step 4: Update LandingPage.js
Add LinkedIn OAuth component and fetch real stats:
- Profile views
- Connection count
- Recent activity
- Skills endorsements

### Step 5: Environment Variables
Create `.env` file:
```
REACT_APP_LINKEDIN_CLIENT_ID=your_client_id
REACT_APP_LINKEDIN_CLIENT_SECRET=your_client_secret
REACT_APP_LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback
```

## Alternative: Use LinkedIn Public Profile API
For simpler implementation without OAuth, you can use:
- LinkedIn Profile Badge (embed)
- LinkedIn Share Button
- Public profile data (limited)

## Note
LinkedIn API requires OAuth for detailed stats. The current implementation provides a link to your profile and can be enhanced later with OAuth.





