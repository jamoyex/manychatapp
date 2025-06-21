const express = require('express');
const router = express.Router();
const crypto = require('crypto');

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
      const agents = await pool.query(
        'SELECT * FROM agents WHERE owner_id = $1 ORDER BY created_at DESC',
        [req.session.userId]
      );

      res.json({ agents: agents.rows });
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

      const agent_id = await generateAgentId(pool);

      const newAgent = await pool.query(
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

      res.status(201).json({ agent: newAgent.rows[0] });

    } catch (error) {
      console.error('Create agent error:', error);
      res.status(500).json({ error: 'Failed to create agent' });
    }
  });

  // GET /api/agents/:id - Fetch a single agent by ID
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
        'youtube_url', 'is_active'
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
      
      const query = `
        UPDATE agents 
        SET ${setClause}
        WHERE id = $${valueIndex++} AND owner_id = $${valueIndex++}
        RETURNING *
      `;
      
      const queryValues = [...valuesToUpdate, id, req.session.userId];
      const result = await pool.query(query, queryValues);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found or you do not have permission to update it.' });
      }

      res.json({ agent: result.rows[0] });

    } catch (error) {
      console.error('Update agent error:', error);
      res.status(500).json({ error: 'Failed to update agent' });
    }
  });

  return router;
}; 