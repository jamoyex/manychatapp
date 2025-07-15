// Configuration for authentication and security settings

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
  // Allow localhost for development (even with direct access)
  if (currentDomain === 'localhost' || currentDomain === '127.0.0.1') {
    return true
  }
  
  // If no referrer and direct access is not allowed, block access
  if (!referrer && !AUTH_CONFIG.SECURITY.ALLOW_DIRECT_ACCESS) {
    return false
  }
  
  // If no referrer but direct access is allowed (for development)
  if (!referrer && AUTH_CONFIG.SECURITY.ALLOW_DIRECT_ACCESS) {
    return true
  }
  
  // Check if referrer is from allowed domains
  return AUTH_CONFIG.ALLOWED_DOMAINS.some(domain => 
    referrer.includes(domain) || currentDomain.includes(domain)
  )
} 