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

// Validation functions
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
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