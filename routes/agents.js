const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
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

  // GET /api/agents/:id/knowledge-base - Fetch knowledge base items for an agent
  router.get('/:id/knowledge-base', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { id } = req.params;
      const { rows } = await pool.query(
        `SELECT 
          id, 
          agent_id, 
          knowledge_base_type,
          title,
          file_name, 
          file_size, 
          file_type, 
          file_url, 
          link,
          content,
          question,
          answer,
          trained, 
          status, 
          uploaded_at,
          last_updated,
          is_active
        FROM knowledge_base 
        WHERE agent_id = $1
        ORDER BY uploaded_at DESC`,
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
          `INSERT INTO knowledge_base (
            agent_id, 
            knowledge_base_type, 
            title, 
            file_name, 
            file_size, 
            file_type, 
            status, 
            file_url,
            last_updated
          )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP) RETURNING *`,
          [
            agentId, 
            'file', 
            `File: ${file.originalname}`, 
            file.originalname, 
            file.size, 
            file.mimetype, 
            'UPLOADED', 
            publicUrl
          ]
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

      // Soft delete by marking as inactive
      await pool.query(
        'UPDATE knowledge_base SET is_active = false WHERE id = $1 AND agent_id = $2',
        [fileId, agentId]
      );

      res.json({ 
        message: `${file.knowledge_base_type} marked for deletion. Click "Train Bot" to permanently remove.` 
      });

    } catch (error) {
      console.error('Delete knowledge base file error:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  // PUT /api/agents/:id/knowledge-base/:fileId - Update a knowledge base item
  router.put('/:id/knowledge-base/:fileId', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id: agentId, fileId } = req.params;
    const { link, content, question, answer, title, trained } = req.body;

    try {
      // Check if agent exists and belongs to user
      const agentResult = await pool.query(
        'SELECT id FROM agents WHERE id = $1 AND owner_id = $2',
        [agentId, req.session.userId]
      );

      if (agentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found or you do not have permission.' });
      }

      // Get item info before update
      const itemResult = await pool.query(
        'SELECT * FROM knowledge_base WHERE id = $1 AND agent_id = $2 AND is_active = true',
        [fileId, agentId]
      );

      if (itemResult.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      const item = itemResult.rows[0];

      // Build update query based on item type
      let updateQuery = 'UPDATE knowledge_base SET last_updated = CURRENT_TIMESTAMP';
      let updateParams = [];
      let paramIndex = 1;

      if (item.knowledge_base_type === 'link' && link !== undefined) {
        updateQuery += `, link = $${paramIndex++}`;
        updateParams.push(link);
      }

      if (item.knowledge_base_type === 'text' && content !== undefined) {
        updateQuery += `, content = $${paramIndex++}`;
        updateParams.push(content);
      }

      if (item.knowledge_base_type === 'qa') {
        if (question !== undefined) {
          updateQuery += `, question = $${paramIndex++}`;
          updateParams.push(question);
        }
        if (answer !== undefined) {
          updateQuery += `, answer = $${paramIndex++}`;
          updateParams.push(answer);
        }
      }

      if (title !== undefined) {
        updateQuery += `, title = $${paramIndex++}`;
        updateParams.push(title);
      }

      if (trained !== undefined) {
        updateQuery += `, trained = $${paramIndex++}`;
        updateParams.push(trained);
      }

      updateQuery += ` WHERE id = $${paramIndex++} AND agent_id = $${paramIndex++}`;
      updateParams.push(fileId, agentId);

      await pool.query(updateQuery, updateParams);

      res.json({ 
        message: `${item.knowledge_base_type} updated successfully. Click "Train Bot" to apply changes.` 
      });

    } catch (error) {
      console.error('Update knowledge base item error:', error);
      res.status(500).json({ error: 'Failed to update item' });
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

      // Get current knowledge base files to get a count (only active items)
      const knowledgeBaseResult = await pool.query(
        'SELECT id FROM knowledge_base WHERE agent_id = $1 AND is_active = true',
        [agent.id]
      );

      // Check if there are inactive items that need permanent deletion
      const inactiveItemsResult = await pool.query(
        'SELECT id FROM knowledge_base WHERE agent_id = $1 AND is_active = false',
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

      // Permanently delete inactive items before training
      await pool.query(
        'DELETE FROM knowledge_base WHERE agent_id = $1 AND is_active = false',
        [agent.id]
      );

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

  // Upload bot image for an agent
  router.post('/:agentId/upload-bot-image', upload.single('botImage'), async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { agentId } = req.params;
      
      // Check if agent exists and belongs to user
      const agentResult = await pool.query(
        'SELECT id FROM agents WHERE id = $1 AND owner_id = $2',
        [agentId, req.session.userId]
      );

      if (agentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found or you do not have permission.' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' });
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (req.file.size > maxSize) {
        return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
      }

      // Compress image using sharp
      const compressedBuffer = await sharp(req.file.buffer)
        .resize(800, 800, { fit: 'inside' }) // Resize to max 800x800 pixels, maintaining aspect ratio
        .jpeg({ quality: 80 }) // Compress as JPEG with 80% quality
        .toBuffer();

      // Generate unique filename (always use .jpg for compressed images)
      const fileName = `bot-images/${agentId}/${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;

      // Initialize R2 client
      const r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      });

      // Upload to Cloudflare R2
      await r2Client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileName,
          Body: compressedBuffer, // Use compressed buffer
          ContentType: 'image/jpeg', // Always JPEG for compressed images
          Metadata: {
            originalName: req.file.originalname,
            agentId: agentId.toString(),
            uploadedBy: req.session.userId.toString(),
            originalSize: req.file.size.toString(),
            compressedSize: compressedBuffer.length.toString()
          }
        })
      );

      // Generate public URL
      const imageUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;

      // Update agent with new image URL
      await pool.query(
        'UPDATE agents SET bot_image_url = $1 WHERE id = $2',
        [imageUrl, agentId]
      );

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
      `, [agentId, req.session.userId]);

      res.json({ 
        success: true, 
        imageUrl,
        agent: updatedAgentResult.rows[0]
      });

    } catch (error) {
      console.error('Error uploading bot image:', error);
      res.status(500).json({ error: 'Failed to upload bot image' });
    }
  });

  // Get ManyChat page info for an agent
  router.get('/:agentId/manychat-page-info', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { agentId } = req.params;
      
      // Check if agent exists and belongs to user
      const agentResult = await pool.query(
        'SELECT id FROM agents WHERE id = $1 AND owner_id = $2',
        [agentId, req.session.userId]
      );

      if (agentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found or you do not have permission.' });
      }

      // Get the app token from app_installs
      const installResult = await pool.query(
        'SELECT app_token FROM app_installs WHERE agent_id = $1 AND is_active = true',
        [agentId]
      );

      if (installResult.rows.length === 0) {
        return res.status(404).json({ error: 'ManyChat not connected for this agent' });
      }

      const appToken = installResult.rows[0].app_token;

      // Make request to ManyChat API to get page info
      const response = await fetch('https://api.manychat.com/fb/page/getInfo', {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${appToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch page info from ManyChat');
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error fetching ManyChat page info:', error);
      res.status(500).json({ error: error.message });
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

  // PUT /api/agents/:id/typing-indicator-flow - Update typing indicator flow ID
  router.put('/:id/typing-indicator-flow', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { id } = req.params;
      const { flowId } = req.body;

      // Check if agent exists and belongs to user
      const agentResult = await pool.query(
        'SELECT id FROM agents WHERE id = $1 AND owner_id = $2',
        [id, req.session.userId]
      );

      if (agentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found or you do not have permission.' });
      }

      // Update the typing indicator flow ID
      await pool.query(`
        UPDATE agents 
        SET typing_indicator_flow = $1
        WHERE id = $2 AND owner_id = $3
      `, [flowId, id, req.session.userId]);

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
      console.error('Update typing indicator flow error:', error);
      res.status(500).json({ error: 'Failed to update typing indicator flow' });
    }
  });

  // Add knowledge base item (link, text, or Q&A)
  router.post('/:agentId/knowledge', async (req, res) => {
    try {
      const { agentId } = req.params;
      const { knowledge_base_type, link, content, question, answer } = req.body;

      // Validate agent exists
      const agentResult = await pool.query(
        'SELECT id FROM agents WHERE id = $1',
        [agentId]
      );

      if (agentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      let title = '';
      let insertData = {};

      switch (knowledge_base_type) {
        case 'link':
          if (!link || !link.trim()) {
            return res.status(400).json({ error: 'Link is required' });
          }
          title = `Link: ${new URL(link).hostname}`;
          insertData = { link: link.trim() };
          break;

        case 'text':
          if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Content is required' });
          }
          title = `Text: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`;
          insertData = { content: content.trim() };
          break;

        case 'qa':
          if (!question || !question.trim() || !answer || !answer.trim()) {
            return res.status(400).json({ error: 'Question and answer are required' });
          }
          title = `Q&A: ${question.substring(0, 50)}${question.length > 50 ? '...' : ''}`;
          insertData = { question: question.trim(), answer: answer.trim() };
          break;

        default:
          return res.status(400).json({ error: 'Invalid knowledge_base_type. Must be link, text, or qa' });
      }

      // Calculate file size for the knowledge base item
      let fileSize = 0;
      switch (knowledge_base_type) {
        case 'link':
          try {
            // Make a GET request to the link to estimate file size
            const response = await fetch(link, {
              method: 'GET',
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; BBCoreBot/1.0)'
              },
              timeout: 10000 // 10 second timeout
            });
            
            if (response.ok) {
              // Get content length from headers if available
              const contentLength = response.headers.get('content-length');
              if (contentLength) {
                fileSize = parseInt(contentLength);
              } else {
                // If no content-length header, read the response and extract meaningful text
                const html = await response.text();
                
                // Extract text content by removing HTML tags and scripts
                let textContent = html
                  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
                  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
                  .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
                  .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                  .trim(); // Remove leading/trailing whitespace
                
                // Calculate size based on extracted text content only
                fileSize = Buffer.byteLength(textContent, 'utf8');
              }
            } else {
              // Fallback to URL length if request fails
              fileSize = Buffer.byteLength(link || '', 'utf8');
            }
          } catch (error) {
            console.error('Error fetching link for size estimation:', error);
            // Fallback to URL length if request fails
            fileSize = Buffer.byteLength(link || '', 'utf8');
          }
          break;
        case 'text':
          fileSize = Buffer.byteLength(content || '', 'utf8'); // More accurate UTF-8 byte calculation
          break;
        case 'qa':
          fileSize = Buffer.byteLength((question || '') + (answer || ''), 'utf8'); // More accurate UTF-8 byte calculation
          break;
      }

      // Insert into knowledge_base table
      const result = await pool.query(
        `INSERT INTO knowledge_base 
         (agent_id, knowledge_base_type, title, link, content, question, answer, file_size, status, last_updated) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          agentId,
          knowledge_base_type,
          title,
          insertData.link || null,
          insertData.content || null,
          insertData.question || null,
          insertData.answer || null,
          fileSize,
          'PENDING'
        ]
      );

      res.status(201).json({ 
        success: true, 
        knowledgeItem: result.rows[0] 
      });

    } catch (error) {
      console.error('Error adding knowledge base item:', error);
      res.status(500).json({ error: 'Failed to add knowledge base item' });
    }
  });

  return router;
}; 