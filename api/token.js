// Vercel Edge Function for Strava token exchange
// Keeps CLIENT_SECRET server-side for security

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only accept POST
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { code, redirect_uri } = body;

  console.log('[Token Exchange] Received request:', { code: code ? '***' + code.slice(-6) : null, redirect_uri });

  if (!code) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization code' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!redirect_uri) {
    return new Response(
      JSON.stringify({ error: 'Missing redirect_uri' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get client secret from environment variable
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  
  if (!clientSecret) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Exchange code for token with Strava
    // MUST include redirect_uri - must match exactly what was used in authorize request
    const params = new URLSearchParams({
      client_id: '225803',
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirect_uri
    });

    console.log('[Token Exchange] Sending to Strava:', {
      client_id: '225803',
      client_secret: clientSecret ? '***' + clientSecret.slice(-4) : 'MISSING',
      code: code ? '***' + code.slice(-6) : null,
      grant_type: 'authorization_code',
      redirect_uri: redirect_uri
    });

    const stravaRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    console.log('[Token Exchange] Strava response status:', stravaRes.status);

    if (!stravaRes.ok) {
      const errorData = await stravaRes.json();
      console.error('[Token Exchange] Strava error:', errorData);
      return new Response(
        JSON.stringify({ 
          error: errorData.message || 'Strava token exchange failed',
          details: errorData.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await stravaRes.json();

    // Return only what the frontend needs
    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
        athlete: tokenData.athlete
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
