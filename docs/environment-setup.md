# Environment Variables Setup

## Authentication Security Configuration

The allowed domains for authentication are now configured via environment variables for better security.

### Required Environment Variables

Add these to your `.env` file:

```env
# Authentication Security
# Comma-separated list of domains allowed to use the auth redirect
ALLOWED_AUTH_DOMAINS=portal.botbuilders.com,app.automator.ai
```

### Example .env File

```env
# Database Configuration
DB_HOST=your_postgres_host
DB_PORT=5432
DB_USER=your_postgres_username
DB_PASS=your_postgres_password
DB_NAME=your_database_name

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Authentication Security
ALLOWED_AUTH_DOMAINS=portal.botbuilders.com,app.automator.ai

# ManyChat Integration
MANYCHAT_INSTALL_LINK=https://your-manychat-installation-link.com

# Cloudflare R2 for Knowledge Base File Storage
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_r2_bucket_name
R2_PUBLIC_URL=your_r2_public_url

# Knowledge Base Training Webhook
KNOWLEDGE_BASE_WEBHOOK_URL=https://your-n8n-or-zapier-webhook-url.com

# Application Configuration
NODE_ENV=development
PORT=3000
```

### Domain Configuration

#### Development
- `localhost` and `127.0.0.1` are automatically allowed for development
- No need to add them to `ALLOWED_AUTH_DOMAINS`

#### Production
- Add your production domains to `ALLOWED_AUTH_DOMAINS`
- Separate multiple domains with commas
- No spaces around commas

#### Examples

```env
# Single domain
ALLOWED_AUTH_DOMAINS=portal.botbuilders.com

# Multiple domains
ALLOWED_AUTH_DOMAINS=portal.botbuilders.com,app.automator.ai

# Multiple domains with subdomains
ALLOWED_AUTH_DOMAINS=portal.botbuilders.com,app.automator.ai,api.botbuilders.com
```

### Security Benefits

1. **No Hardcoded Domains**: Domains are not exposed in the source code
2. **Environment-Specific**: Different domains for different environments
3. **Easy Updates**: Change domains without code changes
4. **Version Control Safe**: Sensitive data not in git history

### Deployment

Make sure to set the `ALLOWED_AUTH_DOMAINS` environment variable in your deployment platform:

- **Railway**: Add in Environment Variables section
- **Vercel**: Add in Environment Variables section
- **Heroku**: Use `heroku config:set ALLOWED_AUTH_DOMAINS=domain1.com,domain2.com`
- **Docker**: Add to your docker-compose.yml or Dockerfile

### Fallback Behavior

If `ALLOWED_AUTH_DOMAINS` is not set:
- Only `localhost` and `127.0.0.1` will be allowed
- Production domains will be blocked
- Authentication will fail for external domains 