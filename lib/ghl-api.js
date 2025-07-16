// GHL API utility functions with automatic token refresh

/**
 * Make a GHL API call with automatic token refresh
 * @param {number} agentId - The agent ID
 * @param {string} endpoint - The GHL API endpoint (e.g., '/v1/contacts/')
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Object>} The API response
 */
export async function makeGHLAPICall(agentId, endpoint, options = {}) {
  try {
    const response = await fetch('/api/ghl/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentId,
        endpoint,
        ...options
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'GHL API call failed');
    }

    return await response.json();
  } catch (error) {
    console.error('GHL API call error:', error);
    throw error;
  }
}

/**
 * Get location details from GHL
 * @param {number} agentId - The agent ID
 * @param {string} locationId - The location ID
 * @returns {Promise<Object>} Location data
 */
export async function getGHLLocation(agentId, locationId) {
  const endpoint = `/locations/${locationId}`;
  
  return makeGHLAPICall(agentId, endpoint, {
    method: 'GET'
  });
}

/**
 * Get businesses from GHL
 * @param {number} agentId - The agent ID
 * @param {string} locationId - The location ID
 * @returns {Promise<Object>} Businesses data
 */
export async function getGHLBusinesses(agentId, locationId) {
  const endpoint = `/businesses/?locationId=${locationId}`;
  
  return makeGHLAPICall(agentId, endpoint, {
    method: 'GET'
  });
}

/**
 * Get contacts from GHL
 * @param {number} agentId - The agent ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>} Contacts data
 */
export async function getGHLContacts(agentId, filters = {}) {
  const queryParams = new URLSearchParams(filters).toString();
  const endpoint = `/contacts/${queryParams ? `?${queryParams}` : ''}`;
  
  return makeGHLAPICall(agentId, endpoint, {
    method: 'GET'
  });
}

/**
 * Create a contact in GHL
 * @param {number} agentId - The agent ID
 * @param {Object} contactData - Contact data
 * @returns {Promise<Object>} Created contact
 */
export async function createGHLContact(agentId, contactData) {
  return makeGHLAPICall(agentId, '/contacts/', {
    method: 'POST',
    body: JSON.stringify(contactData)
  });
}

/**
 * Update a contact in GHL
 * @param {number} agentId - The agent ID
 * @param {string} contactId - The contact ID
 * @param {Object} contactData - Updated contact data
 * @returns {Promise<Object>} Updated contact
 */
export async function updateGHLContact(agentId, contactId, contactData) {
  return makeGHLAPICall(agentId, `/contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify(contactData)
  });
}

/**
 * Get custom fields from GHL
 * @param {number} agentId - The agent ID
 * @returns {Promise<Object>} Custom fields data
 */
export async function getGHLCustomFields(agentId) {
  return makeGHLAPICall(agentId, '/custom-fields/', {
    method: 'GET'
  });
}

/**
 * Test GHL connection
 * @param {number} agentId - The agent ID
 * @returns {Promise<Object>} Test result
 */
export async function testGHLConnection(agentId) {
  // This will be handled by the backend which gets the locationId from the database
  return makeGHLAPICall(agentId, '/test', {
    method: 'POST'
  });
} 