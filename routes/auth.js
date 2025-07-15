const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

module.exports = (pool) => {
  // POST /api/auth/register
  router.post('/register', async (req, res) => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = await pool.query(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
        [name, email, hashedPassword]
      );

      req.session.userId = newUser.rows[0].id;
      res.status(201).json({ user: newUser.rows[0] });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (user.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.rows[0].password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      req.session.userId = user.rows[0].id;
      res.json({ user: { id: user.rows[0].id, name: user.rows[0].name, email: user.rows[0].email } });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/auth/login-email (for email-only authentication)
  router.post('/login-email', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (user.rows.length === 0) {
        return res.status(401).json({ error: 'User not found with this email' });
      }

      // Set session for the user
      req.session.userId = user.rows[0].id;
      res.json({ 
        message: 'Login successful',
        user: { 
          id: user.rows[0].id, 
          name: user.rows[0].name, 
          email: user.rows[0].email,
          uuid: user.rows[0].uuid 
        } 
      });
    } catch (error) {
      console.error('Email login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/auth/login-uuid (for UUID-based authentication)
  router.post('/login-uuid', async (req, res) => {
    try {
      const { uuid } = req.body;

      if (!uuid) {
        return res.status(400).json({ error: 'UUID is required' });
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(uuid)) {
        return res.status(400).json({ error: 'Invalid UUID format' });
      }

      const user = await pool.query('SELECT * FROM users WHERE uuid = $1', [uuid]);
      if (user.rows.length === 0) {
        return res.status(401).json({ error: 'User not found with this UUID' });
      }

      // Set session for the user
      req.session.userId = user.rows[0].id;
      res.json({ 
        message: 'Login successful',
        user: { 
          id: user.rows[0].id, 
          name: user.rows[0].name, 
          email: user.rows[0].email,
          uuid: user.rows[0].uuid 
        } 
      });
    } catch (error) {
      console.error('UUID login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/auth/logout
  router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Could not log out' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // GET /api/auth/me
  router.get('/me', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const user = await pool.query('SELECT id, name, email, core_credits, created_at FROM users WHERE id = $1', [req.session.userId]);
      if (user.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }
      res.json({ user: user.rows[0] });
    } catch (error) {
      console.error('Auth check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}; 