const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // GET /api/public/ghl/custom-fields/{agentId} - Public endpoint to get GHL custom fields
  router.get('/ghl/custom-fields/:agentId', async (req, res) => {
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

      // First find the agent by agent_id to get the actual id
      console.log('Looking for agent with agent_id:', agentId);
      const agentResult = await pool.query(
        'SELECT id FROM agents WHERE agent_id = $1',
        [agentId]
      );
      
      if (agentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      const actualAgentId = agentResult.rows[0].id;
      console.log('Found agent with actual id:', actualAgentId);
      
      // Now get the GHL integration using the actual agent id
      const integrationResult = await pool.query(
        'SELECT g.ghl_location_id, g.is_active FROM ghl_integrations g WHERE g.agent_id = $1',
        [actualAgentId]
      );
      
      console.log('Integration query result:', integrationResult.rows);
      
      if (integrationResult.rows.length === 0) {
        return res.status(404).json({ 
          error: 'No GHL integration found for this agent',
          requestedAgentId: agentId,
          actualAgentId: actualAgentId
        });
      }

      const integration = integrationResult.rows[0];
      
      if (!integration.is_active) {
        return res.status(400).json({ error: 'GHL integration is not active for this agent' });
      }

      // Import the getValidAccessToken function from connect.js
      const connectRoutes = require('./connect');
      const connectRouter = connectRoutes(pool);
      
      // Get a valid access token (automatically refreshes if needed)
      // We need to access the getValidAccessToken function from connect.js
      // Let me create a simpler approach by duplicating the token logic here
      
      // Get the integration details for token refresh
      const tokenIntegrationResult = await pool.query(
        'SELECT * FROM ghl_integrations WHERE agent_id = $1 AND is_active = true',
        [actualAgentId]
      );
      
      if (tokenIntegrationResult.rows.length === 0) {
        throw new Error('No active GHL integration found for this agent');
      }
      
      const tokenIntegration = tokenIntegrationResult.rows[0];
      
      // Check if token is expired or will expire soon (within 5 minutes)
      const now = new Date();
      const expiresAt = new Date(tokenIntegration.token_expires_at);
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
      
      let accessToken;
      
      // If token is still valid for more than 5 minutes, use it
      if (expiresAt > fiveMinutesFromNow) {
        // Decrypt the token
        const crypto = require('crypto');
        function decrypt(encryptedText, key) {
          const [ivHex, encrypted] = encryptedText.split(':');
          const iv = Buffer.from(ivHex, 'hex');
          const keyHash = crypto.createHash('sha256').update(key).digest();
          const decipher = crypto.createDecipheriv('aes-256-cbc', keyHash, iv);
          let decrypted = decipher.update(encrypted, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          return decrypted;
        }
        accessToken = decrypt(tokenIntegration.access_token, process.env.ENCRYPTION_KEY);
      } else {
        // Token needs refresh - for now, return an error suggesting to reconnect
        return res.status(401).json({ 
          error: 'Token expired. Please reconnect your GHL integration.',
          needsReconnect: true
        });
      }
      
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
      
      // Filter for TEXT data type only, then extract only id and name
      const filteredFields = (customFieldsData.customFields || [])
        .filter(field => field.dataType === 'TEXT')
        .map(field => ({
          id: field.id,
          name: field.name
        }));
      
      res.json({
        success: true,
        agentId: agentId,
        actualAgentId: actualAgentId,
        model: model,
        customFields: filteredFields,
        count: filteredFields.length
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