// Vercel Edge Function for Strava token exchange and refresh
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

  const { code, redirect_uri, refresh_token, grant_type } = body;

  // Determine the grant type
  const effectiveGrantType = grant_type || (refresh_token ? 'refresh_token' : (code ? 'authorization_code' : null));

  if (!effectiveGrantType) {
    return new Response(
      JSON.stringify({ error: 'Missing grant_type or code/refresh_token' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get client secret from environment variable
  const clientSecret = (process.env.STRAVA_CLIENT_SECRET || '').trim();
  
  if (!clientSecret) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    let params;
    
    if (effectiveGrantType === 'refresh_token') {
      // Validate refresh token request
      if (!refresh_token) {
        return new Response(
          JSON.stringify({ error: 'Missing refresh_token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Token Refresh] Refreshing access token');
      
      params = new URLSearchParams({
        client_id: '225803',
        client_secret: clientSecret,
        refresh_token: refresh_token,
        grant_type: 'refresh_token'
      });
    } else {
      // Authorization code exchange
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

      console.log('[Token Exchange] Received request:', { code: code ? '***' + code.slice(-6) : null, redirect_uri });

      params = new URLSearchParams({
        client_id: '225803',
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirect_uri
      });
    }

    console.log(`[Token ${effectiveGrantType === 'refresh_token' ? 'Refresh' : 'Exchange'}] Sending to Strava:`, {
      client_id: '225803',
      client_secret: clientSecret ? '***' + clientSecret.slice(-4) : 'MISSING',
      grant_type: effectiveGrantType,
      ...(effectiveGrantType === 'refresh_token' ? { refresh_token: refresh_token ? '***' + refresh_token.slice(-6) : null } : { code: code ? '***' + code.slice(-6) : null })
    });

    const stravaRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    console.log(`[Token ${effectiveGrantType === 'refresh_token' ? 'Refresh' : 'Exchange'}] Strava response status:`, stravaRes.status);

    if (!stravaRes.ok) {
      const errorData = await stravaRes.json();
      console.error(`[Token ${effectiveGrantType === 'refresh_token' ? 'Refresh' : 'Exchange'}] Strava error:`, JSON.stringify(errorData));
      console.error(`[Token Exchange] redirect_uri sent:`, redirect_uri);
      return new Response(
        JSON.stringify({
          error: errorData.message || `Strava token ${effectiveGrantType === 'refresh_token' ? 'refresh' : 'exchange'} failed`,
          details: errorData.errors,
          debug: { redirect_uri_received: redirect_uri, client_id: '225803' }
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
    console.error('[Token Handler] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
