const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Encryption utilities
function encrypt(text, key) {
  const iv = crypto.randomBytes(16);
  // Create a hash of the key to ensure it's the right length for AES-256
  const keyHash = crypto.createHash('sha256').update(key).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', keyHash, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText, key) {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  // Create a hash of the key to ensure it's the right length for AES-256
  const keyHash = crypto.createHash('sha256').update(key).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyHash, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// GHL OAuth URL generator
function generateGHLOAuthUrl(agentId, state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.GHL_CLIENT_ID,
    redirect_uri: process.env.GHL_REDIRECT_URI || 'http://localhost:3000/api/connect/callback',
    scope: 'contacts.readonly contacts.write locations/customFields.readonly locations/customFields.write locations.readonly',
    state: state || agentId.toString(),
  });
  
  // According to GHL docs, the correct OAuth URL is:
  const oauthUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?${params.toString()}`;
  console.log('Generated OAuth URL:', oauthUrl);
  return oauthUrl;
}

// Exchange authorization code for tokens
async function exchangeCodeForTokens(code) {
  console.log('Exchanging code for tokens...');
  console.log('Client ID:', process.env.GHL_CLIENT_ID);
  console.log('Redirect URI:', process.env.GHL_REDIRECT_URI || 'http://localhost:3000/api/connect/callback');
  
  const tokenData = {
    grant_type: 'authorization_code',
    client_id: process.env.GHL_CLIENT_ID,
    client_secret: process.env.GHL_CLIENT_SECRET,
    code,
    redirect_uri: process.env.GHL_REDIRECT_URI || 'http://localhost:3000/api/connect/callback',
  };
  
  console.log('Token request data:', { ...tokenData, client_secret: '[HIDDEN]' });
  
  const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams(tokenData),
  });

  console.log('Token response status:', response.status);
  console.log('Token response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const error = await response.text();
    console.error('Token exchange error response:', error);
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  const result = await response.json();
  console.log('Token exchange successful:', { ...result, access_token: '[HIDDEN]', refresh_token: '[HIDDEN]' });
  return result;
}

// Refresh GHL access token using refresh token
async function refreshGHLAccessToken(refreshToken) {
  console.log('Refreshing GHL access token...');
  
  const tokenData = {
    grant_type: 'refresh_token',
    client_id: process.env.GHL_CLIENT_ID,
    client_secret: process.env.GHL_CLIENT_SECRET,
    refresh_token: refreshToken,
  };
  
  console.log('Refresh token request data:', { ...tokenData, client_secret: '[HIDDEN]', refresh_token: '[HIDDEN]' });
  
  const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams(tokenData),
  });

  console.log('Refresh token response status:', response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error('Refresh token error response:', error);
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const result = await response.json();
  console.log('Token refresh successful:', { ...result, access_token: '[HIDDEN]', refresh_token: '[HIDDEN]' });
  return result;
}

// Get valid access token for an agent (with automatic refresh if needed)
async function getValidAccessToken(pool, agentId) {
  console.log('Getting valid access token for agent:', agentId);
  
  // Get the integration
  const integrationResult = await pool.query(
    'SELECT * FROM ghl_integrations WHERE agent_id = $1 AND is_active = true',
    [agentId]
  );
  
  if (integrationResult.rows.length === 0) {
    throw new Error('No active GHL integration found for this agent');
  }
  
  const integration = integrationResult.rows[0];
  
  // Check if token is expired or will expire soon (within 5 minutes)
  const now = new Date();
  const expiresAt = new Date(integration.token_expires_at);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  
  console.log('Token expiration check:', {
    now: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    fiveMinutesFromNow: fiveMinutesFromNow.toISOString(),
    isExpired: now >= expiresAt,
    willExpireSoon: expiresAt <= fiveMinutesFromNow
  });
  
  // If token is still valid for more than 5 minutes, return it
  if (expiresAt > fiveMinutesFromNow) {
    console.log('Token is still valid, returning existing token');
    return decrypt(integration.access_token, process.env.ENCRYPTION_KEY);
  }
  
  // Token is expired or will expire soon, refresh it
  console.log('Token needs refresh, attempting to refresh...');
  
  try {
    const decryptedRefreshToken = decrypt(integration.refresh_token, process.env.ENCRYPTION_KEY);
    const refreshResult = await refreshGHLAccessToken(decryptedRefreshToken);
    
    // Encrypt new tokens
    const encryptedAccessToken = encrypt(refreshResult.access_token, process.env.ENCRYPTION_KEY);
    const encryptedRefreshToken = encrypt(refreshResult.refresh_token, process.env.ENCRYPTION_KEY);
    const tokenExpiresAt = new Date(Date.now() + refreshResult.expires_in * 1000);
    
    // Update the database with new tokens
    await pool.query(`
      UPDATE ghl_integrations 
      SET access_token = $1, refresh_token = $2, token_expires_at = $3, updated_at = CURRENT_TIMESTAMP
      WHERE agent_id = $4
    `, [encryptedAccessToken, encryptedRefreshToken, tokenExpiresAt, agentId]);
    
    console.log('Token refreshed and stored successfully');
    return refreshResult.access_token;
    
  } catch (error) {
    console.error('Failed to refresh token:', error);
    
    // If refresh fails, mark integration as inactive
    await pool.query(`
      UPDATE ghl_integrations 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE agent_id = $1
    `, [agentId]);
    
    throw new Error('Token refresh failed. Please reconnect your GHL integration.');
  }
}

// Get user info from GHL
async function getGHLUserInfo(accessToken) {
  console.log('Getting GHL user info...');
  
  const response = await fetch('https://rest.gohighlevel.com/v2/users/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    },
  });

  console.log('User info response status:', response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error('User info error response:', error);
    throw new Error(`Failed to get user info: ${error}`);
  }

  const result = await response.json();
  console.log('User info successful:', result);
  return result;
}

module.exports = (pool) => {
  // POST /api/connect - Start OAuth flow
  router.post('/connect', async (req, res) => {
    console.log('GHL connect route hit');
    console.log('Session user ID:', req.session.userId);
    console.log('Request body:', req.body);
    
    if (!req.session.userId) {
      console.log('No session user ID found');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { agentId } = req.body;
      console.log('Agent ID from request:', agentId);
      
      if (!agentId) {
        console.log('No agent ID provided');
        return res.status(400).json({ error: 'Agent ID is required' });
      }

      // Verify agent belongs to user
      const agentResult = await pool.query(
        'SELECT id FROM agents WHERE id = $1 AND owner_id = $2',
        [agentId, req.session.userId]
      );

      console.log('Agent query result:', agentResult.rows);

      if (agentResult.rows.length === 0) {
        console.log('Agent not found or no permission');
        return res.status(404).json({ error: 'Agent not found or you do not have permission' });
      }

      // Generate OAuth URL with agent ID as state
      const oauthUrl = generateGHLOAuthUrl(agentId);
      console.log('Generated OAuth URL:', oauthUrl);
      
      res.json({ oauthUrl });
    } catch (error) {
      console.error('GHL OAuth connect error:', error);
      res.status(500).json({ error: 'Failed to generate OAuth URL' });
    }
  });

  // GET /api/ghl/callback - Handle OAuth callback
  router.get('/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;

      // Handle OAuth errors
      if (error) {
        console.error('GHL OAuth error:', error);
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>GHL Connection Failed</title>
          </head>
          <body>
            <script>
              // Send error message to parent window
              if (window.opener) {
                window.opener.postMessage({ type: 'GHL_OAUTH_ERROR', error: '${error}' }, window.location.origin);
                window.close();
              } else {
                // Fallback: redirect if no opener
                window.location.href = '/dashboard?error=oauth_error&message=${error}';
              }
            </script>
            <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
              <h2>❌ Go High Level Connection Failed</h2>
              <p>Error: ${error}</p>
              <p>You can close this window and try again.</p>
            </div>
          </body>
          </html>
        `);
      }

      // Validate required parameters
      if (!code || !state) {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>GHL Connection Failed</title>
          </head>
          <body>
            <script>
              // Send error message to parent window
              if (window.opener) {
                window.opener.postMessage({ type: 'GHL_OAUTH_ERROR', error: 'Missing required parameters' }, window.location.origin);
                window.close();
              } else {
                // Fallback: redirect if no opener
                window.location.href = '/dashboard?error=missing_parameters';
              }
            </script>
            <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
              <h2>❌ Go High Level Connection Failed</h2>
              <p>Error: Missing required parameters</p>
              <p>You can close this window and try again.</p>
            </div>
          </body>
          </html>
        `);
      }

      // Extract agent ID from state
      const agentId = parseInt(state, 10);
      if (isNaN(agentId)) {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>GHL Connection Failed</title>
          </head>
          <body>
            <script>
              // Send error message to parent window
              if (window.opener) {
                window.opener.postMessage({ type: 'GHL_OAUTH_ERROR', error: 'Invalid agent ID' }, window.location.origin);
                window.close();
              } else {
                // Fallback: redirect if no opener
                window.location.href = '/dashboard?error=invalid_agent_id';
              }
            </script>
            <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
              <h2>❌ Go High Level Connection Failed</h2>
              <p>Error: Invalid agent ID</p>
              <p>You can close this window and try again.</p>
            </div>
          </body>
          </html>
        `);
      }

      // Exchange authorization code for tokens
      const tokenResponse = await exchangeCodeForTokens(code);
      console.log('Token response received:', { 
        access_token: tokenResponse.access_token ? '[PRESENT]' : '[MISSING]',
        refresh_token: tokenResponse.refresh_token ? '[PRESENT]' : '[MISSING]',
        expires_in: tokenResponse.expires_in,
        locationId: tokenResponse.locationId,
        companyId: tokenResponse.companyId
      });
      
      // Use the location and company info from the token response
      const locationId = tokenResponse.locationId;
      const companyId = tokenResponse.companyId;
      
      // Get real location details from GHL API
      console.log('Fetching location details from GHL API...');
      const locationResponse = await fetch(`https://services.leadconnectorhq.com/locations/${locationId}`, {
        headers: {
          'Authorization': `Bearer ${tokenResponse.access_token}`,
          'Accept': 'application/json',
          'Version': '2021-07-28',
        },
      });

      let locationName = `Location ${locationId}`;
      let companyName = `Company ${companyId}`;

      if (locationResponse.ok) {
        const locationData = await locationResponse.json();
        const location = locationData.location;
        
        // Use real business name and address
        locationName = location.business?.name || location.name || `Location ${locationId}`;
        companyName = location.business?.name || location.name || `Company ${companyId}`;
        
        console.log('Location details fetched:', {
          locationName,
          companyName,
          businessAddress: location.business?.address,
          businessCity: location.business?.city,
          businessState: location.business?.state,
          businessCountry: location.business?.country
        });
      } else {
        console.log('Failed to fetch location details, using fallback names');
      }

      console.log('Using final location info:', { locationId, companyId, locationName, companyName });

      // Encrypt tokens before storing
      const encryptedAccessToken = encrypt(tokenResponse.access_token, process.env.ENCRYPTION_KEY);
      const encryptedRefreshToken = encrypt(tokenResponse.refresh_token, process.env.ENCRYPTION_KEY);
      const tokenExpiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

      // Store the integration in database
      await pool.query(`
        INSERT INTO ghl_integrations (
          agent_id, ghl_location_id, ghl_company_id, access_token, 
          refresh_token, token_expires_at, location_name, company_name, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        ON CONFLICT (agent_id) 
        DO UPDATE SET 
          ghl_location_id = EXCLUDED.ghl_location_id,
          ghl_company_id = EXCLUDED.ghl_company_id,
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          token_expires_at = EXCLUDED.token_expires_at,
          location_name = EXCLUDED.location_name,
          company_name = EXCLUDED.company_name,
          is_active = true,
          updated_at = CURRENT_TIMESTAMP
      `, [
        agentId,
        locationId,
        companyId,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
        locationName,
        companyName
      ]);

      // Send success response for popup flow
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>GHL Connection Successful</title>
        </head>
        <body>
          <script>
            // Send success message to parent window
            if (window.opener) {
              window.opener.postMessage({ type: 'GHL_OAUTH_SUCCESS' }, window.location.origin);
              window.close();
            } else {
              // Fallback: redirect if no opener
              window.location.href = '/dashboard?success=ghl_connected&account=${encodeURIComponent(companyName)}';
            }
          </script>
          <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h2>✅ Successfully connected to Go High Level!</h2>
            <p><strong>Account Name:</strong> ${companyName}</p>
            <p>You can close this window now.</p>
          </div>
        </body>
        </html>
      `);

    } catch (error) {
      console.error('GHL OAuth callback error:', error);
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>GHL Connection Failed</title>
        </head>
        <body>
          <script>
            // Send error message to parent window
            if (window.opener) {
              window.opener.postMessage({ type: 'GHL_OAUTH_ERROR', error: '${error.message}' }, window.location.origin);
              window.close();
            } else {
              // Fallback: redirect if no opener
              window.location.href = '/dashboard?error=ghl_connection_failed';
            }
          </script>
          <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h2>❌ Failed to connect to Go High Level</h2>
            <p>Error: ${error.message}</p>
            <p>You can close this window and try again.</p>
          </div>
        </body>
        </html>
      `);
    }
  });

  // GET /api/connect/status - Check connection status
  router.get('/status', async (req, res) => {
    console.log('GHL status route hit');
    console.log('Session user ID:', req.session.userId);
    console.log('Query params:', req.query);
    
    if (!req.session.userId) {
      console.log('No session user ID found');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { agentId } = req.query;
      console.log('Agent ID from query:', agentId);

      if (!agentId) {
        console.log('No agent ID provided');
        return res.status(400).json({ error: 'Agent ID is required' });
      }

      // Verify agent belongs to user
      const agentResult = await pool.query(
        'SELECT id FROM agents WHERE id = $1 AND owner_id = $2',
        [agentId, req.session.userId]
      );

      console.log('Agent query result:', agentResult.rows);

      if (agentResult.rows.length === 0) {
        console.log('Agent not found or no permission');
        return res.status(404).json({ error: 'Agent not found or you do not have permission' });
      }

      const integrationResult = await pool.query(
        'SELECT * FROM ghl_integrations WHERE agent_id = $1 AND is_active = true',
        [agentId]
      );
      
      console.log('Integration query result:', integrationResult.rows);
      
      if (integrationResult.rows.length === 0) {
        console.log('No GHL integration found');
        return res.json({
          connected: false,
          message: 'No GHL integration found'
        });
      }

      const integration = integrationResult.rows[0];
      console.log('Integration found:', integration);

      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(integration.token_expires_at);
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
      const isExpired = now >= expiresAt;
      const willExpireSoon = expiresAt <= fiveMinutesFromNow;
      
      console.log('Token expiration check:', {
        now: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        fiveMinutesFromNow: fiveMinutesFromNow.toISOString(),
        isExpired,
        willExpireSoon
      });

      const response = {
        connected: !isExpired,
        locationName: integration.location_name,
        companyName: integration.company_name,
        expiresAt: integration.token_expires_at,
        isExpired,
        willExpireSoon,
        message: isExpired ? 'Token expired' : (willExpireSoon ? 'Token expires soon' : 'Connected')
      };
      
      console.log('Sending status response:', response);
      res.json(response);

    } catch (error) {
      console.error('GHL status check error:', error);
      res.status(500).json({ error: 'Failed to check GHL status' });
    }
  });

  // DELETE /api/ghl/disconnect - Disconnect GHL integration
  router.delete('/disconnect', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { agentId } = req.body;
      
      if (!agentId) {
        return res.status(400).json({ error: 'Agent ID is required' });
      }

      // Verify agent belongs to user
      const agentResult = await pool.query(
        'SELECT id FROM agents WHERE id = $1 AND owner_id = $2',
        [agentId, req.session.userId]
      );

      if (agentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found or you do not have permission' });
      }

      // Deactivate the integration
      await pool.query(`
        UPDATE ghl_integrations 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE agent_id = $1
      `, [agentId]);

      res.json({ success: true });
    } catch (error) {
      console.error('GHL disconnect error:', error);
      res.status(500).json({ error: 'Failed to disconnect from GHL' });
    }
  });

  // POST /api/ghl/call - Make GHL API call with automatic token refresh
  router.post('/call', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { agentId, endpoint, method = 'GET', body } = req.body;
      
      if (!agentId || !endpoint) {
        return res.status(400).json({ error: 'Agent ID and endpoint are required' });
      }

      // Verify agent belongs to user
      const agentResult = await pool.query(
        'SELECT id FROM agents WHERE id = $1 AND owner_id = $2',
        [agentId, req.session.userId]
      );

      if (agentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found or you do not have permission' });
      }

      // Get a valid access token (automatically refreshes if needed)
      const accessToken = await getValidAccessToken(pool, agentId);
      
      // Make the GHL API call
      const ghlResponse = await fetch(`https://services.leadconnectorhq.com${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Version': '2021-07-28',
        },
        ...(body && { body }),
      });

      if (!ghlResponse.ok) {
        const error = await ghlResponse.text();
        throw new Error(`GHL API call failed: ${error}`);
      }

      const data = await ghlResponse.json();
      
      res.json({
        success: true,
        data
      });

    } catch (error) {
      console.error('GHL API call error:', error);
      res.status(500).json({ 
        error: error.message,
        needsReconnect: error.message.includes('reconnect')
      });
    }
  });

  // POST /api/ghl/test - Test GHL API call with automatic token refresh
  router.post('/test', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { agentId } = req.body;
      
      if (!agentId) {
        return res.status(400).json({ error: 'Agent ID is required' });
      }

      // Verify agent belongs to user
      const agentResult = await pool.query(
        'SELECT id FROM agents WHERE id = $1 AND owner_id = $2',
        [agentId, req.session.userId]
      );

      if (agentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found or you do not have permission' });
      }

      // Get the integration to get the locationId
      const integrationResult = await pool.query(
        'SELECT ghl_location_id FROM ghl_integrations WHERE agent_id = $1 AND is_active = true',
        [agentId]
      );
      
      if (integrationResult.rows.length === 0) {
        throw new Error('No active GHL integration found');
      }
      
      const locationId = integrationResult.rows[0].ghl_location_id;
      
      // Get a valid access token (automatically refreshes if needed)
      const accessToken = await getValidAccessToken(pool, agentId);
      
      // Example: Make a GHL API call to get location details
      const response = await fetch(`https://services.leadconnectorhq.com/locations/${locationId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Version': '2021-07-28',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GHL API call failed: ${error}`);
      }

      const locationData = await response.json();
      
      res.json({
        success: true,
        message: 'GHL API call successful',
        locationName: locationData.location?.name || 'Unknown',
        locationEmail: locationData.location?.email || 'No email',
        locationPhone: locationData.location?.phone || 'No phone',
        locationWebsite: locationData.location?.website || 'No website',
        locationAddress: locationData.location?.address || 'No address',
        locationCity: locationData.location?.city || 'No city',
        locationState: locationData.location?.state || 'No state',
        locationCountry: locationData.location?.country || 'No country',
        fullLocationData: locationData.location
      });

    } catch (error) {
      console.error('GHL test API call error:', error);
      res.status(500).json({ 
        error: error.message,
        needsReconnect: error.message.includes('reconnect')
      });
    }
  });

  // GET /api/public/ghl/custom-fields/{agentId} - Public endpoint to get GHL custom fields
  router.get('/public/ghl/custom-fields/:agentId', async (req, res) => {
    try {
      const { agentId } = req.params;
      const { model = 'all' } = req.query; // Optional model parameter: contact, opportunity, or all
      
      if (!agentId) {
        return res.status(400).json({ error: 'Agent ID is required' });
      }

      // Validate model parameter
      const validModels = ['contact', 'opportunity', 'all'];
      if (!validModels.includes(model)) {
        return res.status(400).json({ error: 'Invalid model parameter. Must be: contact, opportunity, or all' });
      }

      // Get the GHL integration for this agent
      const integrationResult = await pool.query(
        'SELECT ghl_location_id, is_active FROM ghl_integrations WHERE agent_id = $1',
        [agentId]
      );
      
      if (integrationResult.rows.length === 0) {
        return res.status(404).json({ error: 'No GHL integration found for this agent' });
      }

      const integration = integrationResult.rows[0];
      
      if (!integration.is_active) {
        return res.status(400).json({ error: 'GHL integration is not active for this agent' });
      }

      // Get a valid access token (automatically refreshes if needed)
      const accessToken = await getValidAccessToken(pool, agentId);
      
      // Build the API endpoint with optional model parameter
      const endpoint = model === 'all' 
        ? `/locations/${integration.ghl_location_id}/customFields`
        : `/locations/${integration.ghl_location_id}/customFields?model=${model}`;
      
      // Make the GHL API call to get custom fields
      const ghlResponse = await fetch(`https://services.leadconnectorhq.com${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Version': '2021-07-28',
        },
      });

      if (!ghlResponse.ok) {
        const error = await ghlResponse.text();
        console.error('GHL custom fields API error:', error);
        throw new Error(`GHL API call failed: ${error}`);
      }

      const customFieldsData = await ghlResponse.json();
      
      res.json({
        success: true,
        agentId: parseInt(agentId),
        model: model,
        customFields: customFieldsData.customFields || [],
        count: customFieldsData.customFields?.length || 0
      });

    } catch (error) {
      console.error('Public GHL custom fields API error:', error);
      res.status(500).json({ 
        error: error.message,
        needsReconnect: error.message.includes('reconnect')
      });
    }
  });

  return router;
}; 