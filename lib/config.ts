// Configuration for authentication and security settings

export const AUTH_CONFIG = {
  // Allowed domains that can use the email-based authentication redirect
  ALLOWED_DOMAINS: [
    'localhost', // For development
    '127.0.0.1', // For development
    'portal.botbuilders.com',
    'app.automator.ai',
  ],
  
  // Additional security settings
  SECURITY: {
    // Maximum redirect delay in milliseconds
    MAX_REDIRECT_DELAY: 3000,
    // Whether to allow direct access (no referrer)
    ALLOW_DIRECT_ACCESS: true,
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
  // Allow if no referrer and direct access is allowed
  if (!referrer && AUTH_CONFIG.SECURITY.ALLOW_DIRECT_ACCESS) {
    return true
  }
  
  // Check if referrer is from allowed domains
  return AUTH_CONFIG.ALLOWED_DOMAINS.some(domain => 
    referrer.includes(domain) || currentDomain.includes(domain)
  )
} 