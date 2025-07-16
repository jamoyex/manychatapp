// Configuration for authentication and security settings

// Go High Level Configuration
export const GHL_CONFIG = {
  clientId: process.env.GHL_CLIENT_ID!,
  clientSecret: process.env.GHL_CLIENT_SECRET!,
  redirectUri: process.env.GHL_REDIRECT_URI || 'http://localhost:3000/api/connect/callback',
  apiBaseUrl: process.env.GHL_API_BASE_URL || 'https://rest.gohighlevel.com/v1',
  oauthUrl: process.env.GHL_OAUTH_URL || 'https://marketplace.gohighlevel.com/oauth/chooselocation',
  encryptionKey: process.env.ENCRYPTION_KEY!,
} as const;

// Validate GHL environment variables
const requiredGHLEnvVars = [
  'GHL_CLIENT_ID',
  'GHL_CLIENT_SECRET', 
  'GHL_REDIRECT_URI',
  'ENCRYPTION_KEY'
];

for (const envVar of requiredGHLEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required GHL environment variable: ${envVar}`);
  }
}

export const AUTH_CONFIG = {
  // Allowed domains that can use the email-based authentication redirect
  ALLOWED_DOMAINS: [
    'localhost', // For development
    '127.0.0.1', // For development
    'portal.botbuilders.com',
    'app.automator.ai',
    'manychat.botbuilders.cloud',
  ],
  
  // Additional security settings
  SECURITY: {
    // Maximum redirect delay in milliseconds
    MAX_REDIRECT_DELAY: 3000,
    // Whether to allow direct access (no referrer) - SET TO FALSE FOR SECURITY
    ALLOW_DIRECT_ACCESS: false,
    // Whether to log authentication attempts
    LOG_AUTH_ATTEMPTS: true,
  }
}

// Helper function to check if a domain is allowed
export function isAllowedDomain(domain: string): boolean {
  return AUTH_CONFIG.ALLOWED_DOMAINS.some(allowed => 
    domain.includes(allowed) || allowed.includes(domain)
  )
}

// Helper function to validate referrer
export function validateReferrer(referrer: string, currentDomain: string): boolean {
  // Debug logging
  console.log('validateReferrer called with:', { referrer, currentDomain })
  
  // Allow localhost for development (even with direct access)
  if (currentDomain === 'localhost' || currentDomain === '127.0.0.1') {
    console.log('Allowing localhost access')
    return true
  }
  
  // If no referrer and direct access is not allowed, block access
  if (!referrer && !AUTH_CONFIG.SECURITY.ALLOW_DIRECT_ACCESS) {
    console.log('Blocking: No referrer and direct access not allowed')
    return false
  }
  
  // If no referrer but direct access is allowed (for development)
  if (!referrer && AUTH_CONFIG.SECURITY.ALLOW_DIRECT_ACCESS) {
    console.log('Allowing: No referrer but direct access allowed')
    return true
  }
  
  // Extract domain from referrer URL
  let referrerDomain: string
  try {
    const referrerUrl = new URL(referrer)
    referrerDomain = referrerUrl.hostname
    console.log('Extracted referrer domain:', referrerDomain)
  } catch (error) {
    console.log('Blocking: Invalid referrer URL')
    // If referrer is not a valid URL, block access
    return false
  }
  
  // Check if referrer domain is in the allowed domains list
  const isAllowed = AUTH_CONFIG.ALLOWED_DOMAINS.some(domain => 
    referrerDomain === domain || referrerDomain.endsWith(`.${domain}`)
  )
  
  console.log('Domain check result:', {
    referrerDomain,
    allowedDomains: AUTH_CONFIG.ALLOWED_DOMAINS,
    isAllowed
  })
  
  return isAllowed
} 