# Strava Command Center

Nocturnal athletic dashboard with secure OAuth authentication.

## Project Structure

```
strava-dashboard/
├── api/
│   └── token.js          # Vercel Edge Function for token exchange
├── public/
│   └── index.html        # Frontend dashboard
├── .env.example          # Environment variable template
├── vercel.json           # Vercel configuration
└── README.md
```

## Deployment to Vercel

### 1. Install Vercel CLI (if not installed)

```bash
npm i -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Deploy

```bash
cd strava-dashboard
vercel
```

### 4. Set Environment Variable

In Vercel Dashboard:
1. Go to your project
2. Settings → Environment Variables
3. Add: `STRAVA_CLIENT_SECRET` = `ea068e72b62076300a7dafdeae38285582102490`
4. Redeploy: `vercel --prod`

### 5. Update Strava App Settings

In [Strava API Settings](https://www.strava.com/settings/api):
- **Authorization Callback Domain**: `YOUR_APP.vercel.app`
- No need for full path, just the domain

### 6. Update index.html (if needed)

The redirect_uri is auto-detected from `window.location.origin`, but verify it's working after deploy.

## Local Development

```bash
cd strava-dashboard

# Create local env file
cp .env.example .env.local
# Edit .env.local with your STRAVA_CLIENT_SECRET

# Run dev server
vercel dev
```

Note: Local OAuth requires Strava app to accept `localhost` as callback.

## Features

- ✓ Secure server-side token exchange (secret never exposed to browser)
- ✓ Auto-detects Vercel URL for OAuth redirect
- ✓ Persists session in localStorage
- ✓ Nocturnal command center UI design
- ✓ Real-time Strava API data
- ✓ Clickable activity links

## Security Notes

- `CLIENT_SECRET` is stored only in Vercel environment variables
- Token exchange happens server-side in `/api/token.js`
- Access token is stored in browser localStorage
- Refresh token is returned but not currently used for token refresh
