const API_BASE_URL = '/api'

export interface AuthResponse {
  message: string
  user: {
    id: number
    name: string
    email: string
  }
}

export interface AuthError {
  error: string
}

// API call functions
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Login failed')
  }

  return data
}

export async function loginUserByUUID(uuid: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login-uuid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ uuid })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Login failed')
  }

  return data
}

export async function registerUser(name: string, email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ name, email, password })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Registration failed')
  }

  return data
}

export async function logoutUser(): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Logout failed')
  }

  return data
}

export async function getCurrentUser(): Promise<{ user: any }> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error('Not authenticated')
  }

  return response.json()
}

export async function getAgents(): Promise<{ agents: any[] }> {
  const response = await fetch(`${API_BASE_URL}/agents`, {
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error('Failed to fetch agents')
  }

  return response.json()
}

export async function getAgentInstallStatus(agentId: number): Promise<{ isInstalled: boolean; agentId: number }> {
  const response = await fetch(`${API_BASE_URL}/agents/${agentId}/install-status`, {
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error('Failed to check install status')
  }

  return response.json()
}

export async function getManyChatInstallLink(): Promise<{ installLink: string }> {
  const response = await fetch(`${API_BASE_URL}/agents/install-link`, {
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error('Failed to get installation link')
  }

  return response.json()
}

// --- KNOWLEDGE BASE API ---
export async function getKnowledgeBase(agentId: number): Promise<{ knowledgeBase: any[] }> {
  const response = await fetch(`${API_BASE_URL}/agents/${agentId}/knowledge-base`, {
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Failed to fetch knowledge base');
  }
  return response.json();
}

export async function uploadKnowledgeBaseFiles(agentId: number, files: File[]): Promise<any> {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const response = await fetch(`${API_BASE_URL}/agents/${agentId}/knowledge-base`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to upload files');
  }

  return data;
}

export async function deleteKnowledgeBaseFile(agentId: number, fileId: number): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/agents/${agentId}/knowledge-base/${fileId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete file');
  }

  return data;
}

export async function trainBot(agentId: number): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/agents/${agentId}/train`, {
    method: 'POST',
    credentials: 'include',
  });
  
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to start training');
  }

  return data;
}

// Validation functions
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters' }
  }
  return { isValid: true }
}

export function validateName(name: string): { isValid: boolean; error?: string } {
  if (name.trim().length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' }
  }
  return { isValid: true }
}

// Form validation
export function validateRegistrationForm(formData: Record<string, string>): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate name
  const nameValidation = validateName(formData.name || '')
  if (!nameValidation.isValid) {
    errors.push(nameValidation.error!)
  }

  // Validate email
  if (!validateEmail(formData.email || '')) {
    errors.push('Please enter a valid email address')
  }

  // Validate password
  const passwordValidation = validatePassword(formData.password || '')
  if (!passwordValidation.isValid) {
    errors.push(passwordValidation.error!)
  }

  // Validate password confirmation
  if (formData.password !== formData.confirmPassword) {
    errors.push('Passwords do not match')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validateLoginForm(formData: Record<string, string>): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate email
  if (!validateEmail(formData.email || '')) {
    errors.push('Please enter a valid email address')
  }

  // Validate password
  if (!formData.password || formData.password.length === 0) {
    errors.push('Password is required')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// localStorage utilities for auth redirect
export const authStorage = {
  // Save email to localStorage with expiration
  saveEmail: (email: string): void => {
    try {
      localStorage.setItem('bbcore_auth_email', email)
      localStorage.setItem('bbcore_auth_email_expires', (Date.now() + 24 * 60 * 60 * 1000).toString())
    } catch (e) {
      console.warn('Failed to save email to localStorage:', e)
    }
  },

  // Get email from localStorage if not expired
  getEmail: (): string | null => {
    try {
      const email = localStorage.getItem('bbcore_auth_email')
      const expires = localStorage.getItem('bbcore_auth_email_expires')
      
      if (!email || !expires) return null
      
      if (Date.now() > parseInt(expires)) {
        // Expired, clean up
        authStorage.clearEmail()
        return null
      }
      
      return email
    } catch (e) {
      console.warn('Failed to get email from localStorage:', e)
      return null
    }
  },

  // Clear email from localStorage
  clearEmail: (): void => {
    try {
      localStorage.removeItem('bbcore_auth_email')
      localStorage.removeItem('bbcore_auth_email_expires')
    } catch (e) {
      console.warn('Failed to clear email from localStorage:', e)
    }
  },

  // Check if email exists and is valid
  hasValidEmail: (): boolean => {
    return authStorage.getEmail() !== null
  }
} 