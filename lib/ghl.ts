import { GHL_CONFIG } from './config';
import type { 
  GHLIntegration, 
  GHLTokenResponse, 
  GHLUserInfo, 
  GHLContact,
  GHLContactCreate,
  GHLContactUpdate,
  GHLCustomField,
  GHLAPIError 
} from './types';
import crypto from 'crypto';

// Encryption utilities
function encrypt(text: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string, key: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// GHL OAuth URL generator
export function generateGHLOAuthUrl(agentId: number, state?: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: GHL_CONFIG.clientId,
    redirect_uri: GHL_CONFIG.redirectUri,
    scope: 'contacts.readonly contacts.write locations/customFields.readonly locations/customFields.write locations.readonly',
    state: state || agentId.toString(),
  });
  
  return `${GHL_CONFIG.oauthUrl}?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string): Promise<GHLTokenResponse> {
  const response = await fetch('https://services.gohighlevel.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: GHL_CONFIG.clientId,
      client_secret: GHL_CONFIG.clientSecret,
      code,
      redirect_uri: GHL_CONFIG.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  return response.json();
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string): Promise<GHLTokenResponse> {
  const response = await fetch('https://services.gohighlevel.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: GHL_CONFIG.clientId,
      client_secret: GHL_CONFIG.clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return response.json();
}

// Get user info from GHL
export async function getGHLUserInfo(accessToken: string): Promise<GHLUserInfo> {
  const response = await fetch(`${GHL_CONFIG.apiBaseUrl}/users/me`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user info: ${error}`);
  }

  return response.json();
}

// Database operations for GHL integrations
export async function createGHLIntegration(
  agentId: number,
  locationId: string,
  companyId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  locationName?: string,
  companyName?: string
): Promise<GHLIntegration> {
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
  
  // Encrypt tokens before storing
  const encryptedAccessToken = encrypt(accessToken, GHL_CONFIG.encryptionKey);
  const encryptedRefreshToken = encrypt(refreshToken, GHL_CONFIG.encryptionKey);

  // TODO: Replace with your actual database client
  // This is a placeholder - you'll need to implement with your DB client
  const query = `
    INSERT INTO ghl_integrations (
      agent_id, ghl_location_id, ghl_company_id, access_token, 
      refresh_token, token_expires_at, location_name, company_name
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (agent_id) 
    DO UPDATE SET 
      ghl_location_id = EXCLUDED.ghl_location_id,
      ghl_company_id = EXCLUDED.ghl_company_id,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      token_expires_at = EXCLUDED.token_expires_at,
      location_name = EXCLUDED.location_name,
      company_name = EXCLUDED.company_name,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  // Placeholder - implement with your database client
  throw new Error('Database integration not implemented yet');
}

export async function getGHLIntegration(agentId: number): Promise<GHLIntegration | null> {
  // TODO: Replace with your actual database client
  const query = 'SELECT * FROM ghl_integrations WHERE agent_id = $1 AND is_active = true';
  
  // Placeholder - implement with your database client
  throw new Error('Database integration not implemented yet');
}

export async function updateGHLTokens(
  agentId: number,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
  
  // Encrypt tokens before storing
  const encryptedAccessToken = encrypt(accessToken, GHL_CONFIG.encryptionKey);
  const encryptedRefreshToken = encrypt(refreshToken, GHL_CONFIG.encryptionKey);

  // TODO: Replace with your actual database client
  const query = `
    UPDATE ghl_integrations 
    SET access_token = $1, refresh_token = $2, token_expires_at = $3, updated_at = CURRENT_TIMESTAMP
    WHERE agent_id = $4
  `;

  // Placeholder - implement with your database client
  throw new Error('Database integration not implemented yet');
}

// Get valid access token (with automatic refresh)
export async function getValidAccessToken(agentId: number): Promise<string> {
  const integration = await getGHLIntegration(agentId);
  
  if (!integration) {
    throw new Error('No GHL integration found for this agent');
  }

  // Decrypt tokens
  const accessToken = decrypt(integration.access_token, GHL_CONFIG.encryptionKey);
  const refreshToken = decrypt(integration.refresh_token, GHL_CONFIG.encryptionKey);

  // Check if token is expired (with 5 minute buffer)
  const now = new Date();
  const expiresAt = new Date(integration.token_expires_at);
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds

  if (now.getTime() + bufferTime >= expiresAt.getTime()) {
    // Token is expired or will expire soon, refresh it
    try {
      const newTokens = await refreshAccessToken(refreshToken);
      await updateGHLTokens(agentId, newTokens.access_token, newTokens.refresh_token, newTokens.expires_in);
      return newTokens.access_token;
    } catch (error) {
      throw new Error(`Failed to refresh GHL token: ${error}`);
    }
  }

  return accessToken;
}

// GHL API client for contacts
export class GHLAPIClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${GHL_CONFIG.apiBaseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GHL API error: ${error}`);
    }

    return response.json();
  }

  // Get contacts
  async getContacts(locationId: string, params?: {
    limit?: number;
    skip?: number;
    email?: string;
    phone?: string;
  }): Promise<{ contacts: GHLContact[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.email) searchParams.append('email', params.email);
    if (params?.phone) searchParams.append('phone', params.phone);

    return this.makeRequest(`/contacts/?${searchParams.toString()}`);
  }

  // Create contact
  async createContact(locationId: string, contact: GHLContactCreate): Promise<GHLContact> {
    return this.makeRequest(`/contacts/`, {
      method: 'POST',
      body: JSON.stringify(contact),
    });
  }

  // Update contact
  async updateContact(contactId: string, updates: GHLContactUpdate): Promise<GHLContact> {
    return this.makeRequest(`/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Get custom fields
  async getCustomFields(locationId: string): Promise<GHLCustomField[]> {
    return this.makeRequest(`/custom-fields/`);
  }
} 