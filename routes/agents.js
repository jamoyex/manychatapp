const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const generateAgentId = async (pool) => {
  let agentId;
  let isUnique = false;
  while (!isUnique) {
    const randomString = crypto.randomBytes(5).toString('hex');
    agentId = `agent_${randomString}`;
    const { rows } = await pool.query('SELECT id FROM agents WHERE agent_id = $1', [agentId]);
    if (rows.length === 0) {
      isUnique = true;
    }
  }
  return agentId;
};

module.exports = (pool) => {
  // GET /api/agents - Fetch all agents for the logged-in user
  router.get('/', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const agentsResult = await pool.query(
        `SELECT 
            a.*, 
            CASE WHEN ai.id IS NOT NULL THEN true ELSE false END as is_installed
         FROM 
            agents a
         LEFT JOIN 
            app_installs ai ON a.id = ai.agent_id
         WHERE 
            a.owner_id = $1 
         ORDER BY 
            a.created_at DESC`,
        [req.session.userId]
      );

      res.json({ agents: agentsResult.rows });
    } catch (error) {
      console.error('Get agents error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/agents/:id/install-status - Check if agent is installed on ManyChat
  router.get('/:id/install-status', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { id } = req.params;
      
      // Check if agent exists and belongs to user
      const agentResult = await pool.query(
        'SELECT id FROM agents WHERE id = $1 AND owner_id = $2',
        [id, req.session.userId]
      );

      if (agentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found or you do not have permission.' });
      }

      // Check if agent is installed in ManyChat
      const installResult = await pool.query(
        'SELECT id FROM app_installs WHERE agent_id = $1 AND is_active = true',
        [id]
      );

      const isInstalled = installResult.rows.length > 0;

      res.json({ 
        isInstalled,
        agentId: id
      });

    } catch (error) {
      console.error('Check install status error:', error);
      res.status(500).json({ error: 'Failed to check install status' });
    }
  });

  // GET /api/agents/install-link - Get ManyChat installation link
  router.get('/install-link', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const installLink = process.env.MANYCHAT_INSTALL_LINK;
      
      if (!installLink) {
        return res.status(500).json({ error: 'ManyChat installation link not configured' });
      }

      res.json({ installLink });

    } catch (error) {
      console.error('Get install link error:', error);
      res.status(500).json({ error: 'Failed to get installation link' });
    }
  });

  // --- KNOWLEDGE BASE ROUTES (must be before /:id) ---

  // GET /api/agents/:id/knowledge-base - Fetch knowledge base files for an agent
  router.get('/:id/knowledge-base', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { id } = req.params;
      const { rows } = await pool.query(
        'SELECT * FROM knowledge_base WHERE agent_id = $1 ORDER BY uploaded_at DESC',
        [id]
      );
      res.json({ knowledgeBase: rows });
    } catch (error) {
      console.error('Get knowledge base error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/agents/:id/knowledge-base - Upload knowledge base files to R2
  router.post('/:id/knowledge-base', upload.array('files'), async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id: agentId } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }

    // Initialize R2 client
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    try {
      const uploadPromises = files.map(async (file) => {
        // Generate unique filename
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `knowledge-base/${agentId}/${timestamp}-${randomString}.${fileExtension}`;

        // Upload to R2
        await r2Client.send(
          new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
            Metadata: {
              originalName: file.originalname,
              agentId: agentId,
              uploadedBy: req.session.userId.toString()
            }
          })
        );

        // Generate public URL
        const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;

        // Save to database
        const result = await pool.query(
          `INSERT INTO knowledge_base (agent_id, file_name, file_size, file_type, status, file_url)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [agentId, file.originalname, file.size, file.mimetype, 'UPLOADED', publicUrl]
        );

        return result.rows[0];
      });

      const results = await Promise.all(uploadPromises);

      res.status(201).json({ 
        message: 'Files uploaded successfully.',
        knowledgeBase: results 
      });

    } catch (error) {
      console.error('Knowledge base upload error:', error.message);
      res.status(500).json({ error: 'Failed to upload files' });
    }
  });

  // DELETE /api/agents/:id/knowledge-base/:fileId - Delete a knowledge base file
  router.delete('/:id/knowledge-base/:fileId', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id: agentId, fileId } = req.params;

    try {
      // Check if agent exists and belongs to user
      const agentResult = await pool.query(
        'SELECT id FROM agents WHERE id = $1 AND owner_id = $2',
        [agentId, req.session.userId]
      );

      if (agentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found or you do not have permission.' });
      }

      // Get file info before deletion
      const fileResult = await pool.query(
        'SELECT * FROM knowledge_base WHERE id = $1 AND agent_id = $2',
        [fileId, agentId]
      );

      if (fileResult.rows.length === 0) {
        return res.status(404).json({ error: 'File not found.' });
      }

      const file = fileResult.rows[0];

      // Delete from R2 if file_url exists
      if (file.file_url) {
        const r2Client = new S3Client({
          region: 'auto',
          endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
          },
        });

        try {
          // Extract key from URL
          const url = new URL(file.file_url);
          const key = url.pathname.substring(1); // Remove leading slash

          await r2Client.send(
            new DeleteObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: key,
            })
          );
        } catch (r2Error) {
          console.error('Failed to delete from R2:', r2Error);
          // Continue with database deletion even if R2 deletion fails
        }
      }

      // Delete from database
      await pool.query(
        'DELETE FROM knowledge_base WHERE id = $1 AND agent_id = $2',
        [fileId, agentId]
      );

      res.json({ message: 'File deleted successfully.' });

    } catch (error) {
      console.error('Delete knowledge base file error:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  // POST /api/agents/:id/train - Train the bot with current knowledge base files
  router.post('/:id/train', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id: agentNumericId } = req.params;
    const webhookUrl = process.env.KNOWLEDGE_BASE_WEBHOOK_URL;

    try {
      // Fetch the full agent details, including the string agent_id
      const agentResult = await pool.query(
        'SELECT id, agent_id, is_training FROM agents WHERE id = $1 AND owner_id = $2',
        [agentNumericId, req.session.userId]
      );

      if (agentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found or you do not have permission.' });
      }

      const agent = agentResult.rows[0];

      // Check if already training
      if (agent.is_training) {
        return res.status(400).json({ error: 'Training is already in progress for this agent.' });
      }

      // Get current knowledge base files to get a count
      const knowledgeBaseResult = await pool.query(
        'SELECT id FROM knowledge_base WHERE agent_id = $1',
        [agent.id]
      );

      // Trigger training webhook if configured
      if (webhookUrl) {
        try {
          // Send the correct agent_id string in the payload
          await axios.post(webhookUrl, {
            agent_id: agent.agent_id 
          });
        } catch (webhookError) {
          console.error('Webhook call failed:', webhookError.message);
          return res.status(500).json({ error: 'Training webhook failed. Please check your webhook configuration.' });
        }
      } else {
        console.warn('KNOWLEDGE_BASE_WEBHOOK_URL not configured - training webhook skipped');
      }

      // Set is_training = true
      await pool.query(
        'UPDATE agents SET is_training = true WHERE id = $1',
        [agent.id]
      );

      res.json({ 
        message: webhookUrl ? 'Training started successfully.' : 'Training status updated. (Webhook not configured)',
        filesCount: knowledgeBaseResult.rows.length
      });

    } catch (error) {
      console.error('Training error:', error.message);
      res.status(500).json({ error: 'Failed to start training' });
    }
  });

  // GET /api/agents/:id - Fetch a single agent by ID (must be after specific :id routes)
  router.get('/:id', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { id } = req.params;
      const agentResult = await pool.query(
        'SELECT * FROM agents WHERE id = $1 AND owner_id = $2',
        [id, req.session.userId]
      );

      if (agentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found or you do not have permission.' });
      }

      res.json({ agent: agentResult.rows[0] });

    } catch (error) {
      console.error('Get single agent error:', error);
      res.status(500).json({ error: 'Failed to retrieve agent' });
    }
  });

  // POST /api/agents - Create a new agent
  router.post('/', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const {
        bot_name,
        company_name,
        industry,
        support_email_address,
        company_description,
        target_audience_description,
        tone_and_style_guide,
        specific_instructions
      } = req.body;

      if (!bot_name) {
        return res.status(400).json({ error: 'Bot name is required.' });
      }

      // Check if user has enough credits
      const userResult = await pool.query(
        'SELECT core_credits FROM users WHERE id = $1',
        [req.session.userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const userCredits = userResult.rows[0].core_credits;
      if (userCredits < 1) {
        return res.status(403).json({ 
          error: 'Insufficient credits. You need at least 1 core credit to create an agent.',
          currentCredits: userCredits,
          requiredCredits: 1
        });
      }

      const agent_id = await generateAgentId(pool);

      // Use a transaction to ensure both agent creation and credit deduction succeed or fail together
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Create the agent
        const newAgent = await client.query(
          `INSERT INTO agents (
            owner_id, agent_id, bot_name, company_name, industry, support_email_address,
            details_about_company, details_about_product_or_service, bot_tone_for_replies, bot_primary_goal
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [
            req.session.userId,
            agent_id,
            bot_name,
            company_name || null,
            industry || null,
            support_email_address || null,
            company_description || null, // Mapped from details_about_company
            target_audience_description || null, // Mapped from details_about_product_or_service
            tone_and_style_guide || null, // Mapped from bot_tone_for_replies
            specific_instructions || null // Mapped from bot_primary_goal
          ]
        );

        // Deduct 1 credit from user
        await client.query(
          'UPDATE users SET core_credits = core_credits - 1 WHERE id = $1',
          [req.session.userId]
        );

        await client.query('COMMIT');

        res.status(201).json({ 
          agent: newAgent.rows[0],
          creditsDeducted: 1,
          remainingCredits: userCredits - 1
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Create agent error:', error);
      res.status(500).json({ error: 'Failed to create agent' });
    }
  });

  // PUT /api/agents/:id - Update an agent
  router.put('/:id', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { id } = req.params;
      const agentData = req.body;

      const updatableFields = [
        'bot_name', 'bot_primary_goal', 'bot_tone_for_replies', 'company_location',
        'company_name', 'company_phone_number', 'details_about_company',
        'details_about_leader', 'details_about_product_or_service', 'facebook_page_url',
        'industry', 'instagram_url', 'leader_full_name', 'linkedin_url',
        'product_or_service_you_sell', 'purchase_book_appointments_here',
        'support_email_address', 'tiktok_url', 'twitter_url', 'website_url',
        'youtube_url', 'is_active', 'enhanced_responses_enabled', 'template_installed',
        'loader_enabled', 'gallery_enabled', 'quick_replies_enabled'
      ];

      const fieldsToUpdate = [];
      const valuesToUpdate = [];
      let valueIndex = 1;

      updatableFields.forEach(field => {
        if (agentData[field] !== undefined) {
          fieldsToUpdate.push(`"${field}" = $${valueIndex++}`);
          valuesToUpdate.push(agentData[field]);
        }
      });

      if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ error: 'No fields to update provided.' });
      }

      const setClause = fieldsToUpdate.join(', ');
      
      const updateQuery = `
        UPDATE agents 
        SET ${setClause}
        WHERE id = $${valueIndex++} AND owner_id = $${valueIndex++}
      `;
      
      const queryValues = [...valuesToUpdate, id, req.session.userId];
      await pool.query(updateQuery, queryValues);

      // After update, re-fetch the agent with the same logic as GET to ensure consistent data
      const updatedAgentResult = await pool.query(`
        SELECT 
            a.*, 
            CASE WHEN ai.id IS NOT NULL THEN true ELSE false END as is_installed
        FROM 
            agents a
        LEFT JOIN 
            app_installs ai ON a.id = ai.agent_id
        WHERE 
            a.id = $1 AND a.owner_id = $2
      `, [id, req.session.userId]);

      if (updatedAgentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found after update.' });
      }

      res.json({ agent: updatedAgentResult.rows[0] });

    } catch (error) {
      console.error('Update agent error:', error);
      res.status(500).json({ error: 'Failed to update agent' });
    }
  });

  // Get ManyChat flows for an agent
  router.get('/:agentId/manychat-flows', async (req, res) => {
    const { agentId } = req.params;
    
    try {
      // Get the app token from app_installs
      const { rows } = await pool.query(
        'SELECT app_token FROM app_installs WHERE agent_id = $1',
        [agentId]
      );

      if (!rows.length || !rows[0].app_token) {
        return res.status(404).json({ error: 'ManyChat token not found for this agent' });
      }

      const appToken = rows[0].app_token;

      // Make request to ManyChat API with exact headers
      const response = await fetch('https://api.manychat.com/fb/page/getFlows', {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${appToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch flows from ManyChat');
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error fetching ManyChat flows:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get intent mappings for an agent
  router.get('/:agentId/intents', async (req, res) => {
    try {
      const { agentId } = req.params;
      const result = await pool.query(
        'SELECT * FROM intent_mappings WHERE agent_id = $1 ORDER BY created_at DESC',
        [agentId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching intents:', error);
      res.status(500).json({ error: 'Failed to fetch intents' });
    }
  });

  // Create new intent mapping
  router.post('/:agentId/intents', async (req, res) => {
    try {
      const { agentId } = req.params;
      const { intent_name, manychat_flow_id } = req.body;

      const result = await pool.query(
        'INSERT INTO intent_mappings (agent_id, intent_name, manychat_flow_id) VALUES ($1, $2, $3) RETURNING *',
        [agentId, intent_name, manychat_flow_id]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating intent:', error);
      res.status(500).json({ error: 'Failed to create intent mapping' });
    }
  });

  // Delete intent mapping
  router.delete('/:agentId/intents/:intentId', async (req, res) => {
    try {
      const { intentId } = req.params;
      await pool.query('DELETE FROM intent_mappings WHERE id = $1', [intentId]);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting intent:', error);
      res.status(500).json({ error: 'Failed to delete intent mapping' });
    }
  });

  // --- ENHANCED RESPONSES ROUTES ---

  // POST /api/agents/:id/check-template - Check if ManyChat template is installed
  router.post('/:id/check-template', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { id } = req.params;
      
      // Check if agent exists and belongs to user
      const agentResult = await pool.query(
        'SELECT id FROM agents WHERE id = $1 AND owner_id = $2',
        [id, req.session.userId]
      );

      if (agentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found or you do not have permission.' });
      }

      // Get the app token from app_installs
      const installResult = await pool.query(
        'SELECT app_token FROM app_installs WHERE agent_id = $1 AND is_active = true',
        [id]
      );

      if (installResult.rows.length === 0) {
        return res.status(404).json({ error: 'ManyChat not connected for this agent' });
      }

      const appToken = installResult.rows[0].app_token;

      // Check if the required flow exists in ManyChat
      const response = await fetch('https://api.manychat.com/fb/page/getFlows', {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${appToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch flows from ManyChat');
      }

      const data = await response.json();
      const flows = data.data || [];
      
      // Look for the BBCORE TYPER flow
      const requiredFlow = flows.find(flow => flow.name === 'BBCORE TYPER');
      const installed = !!requiredFlow;

      // Update the template_installed status in the database
      await pool.query(
        'UPDATE agents SET template_installed = $1 WHERE id = $2',
        [installed, id]
      );

      res.json({ installed });

    } catch (error) {
      console.error('Check template installation error:', error);
      res.status(500).json({ error: 'Failed to check template installation' });
    }
  });

  // PUT /api/agents/:id/enhanced-responses - Update enhanced responses settings
  router.put('/:id/enhanced-responses', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if agent exists and belongs to user
      const agentResult = await pool.query(
        'SELECT id FROM agents WHERE id = $1 AND owner_id = $2',
        [id, req.session.userId]
      );

      if (agentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found or you do not have permission.' });
      }

      // Define allowed fields for enhanced responses
      const allowedFields = [
        'enhanced_responses_enabled',
        'template_installed',
        'loader_enabled',
        'gallery_enabled',
        'quick_replies_enabled'
      ];

      const fieldsToUpdate = [];
      const valuesToUpdate = [];
      let valueIndex = 1;

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          fieldsToUpdate.push(`"${field}" = $${valueIndex++}`);
          valuesToUpdate.push(updateData[field]);
        }
      });

      if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update provided.' });
      }

      const setClause = fieldsToUpdate.join(', ');
      
      const updateQuery = `
        UPDATE agents 
        SET ${setClause}
        WHERE id = $${valueIndex++} AND owner_id = $${valueIndex++}
      `;
      
      const queryValues = [...valuesToUpdate, id, req.session.userId];
      await pool.query(updateQuery, queryValues);

      // Fetch updated agent
      const updatedAgentResult = await pool.query(`
        SELECT 
            a.*, 
            CASE WHEN ai.id IS NOT NULL THEN true ELSE false END as is_installed
        FROM 
            agents a
        LEFT JOIN 
            app_installs ai ON a.id = ai.agent_id
        WHERE 
            a.id = $1 AND a.owner_id = $2
      `, [id, req.session.userId]);

      if (updatedAgentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found after update.' });
      }

      res.json({ agent: updatedAgentResult.rows[0] });

    } catch (error) {
      console.error('Update enhanced responses error:', error);
      res.status(500).json({ error: 'Failed to update enhanced responses settings' });
    }
  });

  return router;
}; 