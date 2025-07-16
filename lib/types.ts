// Go High Level Integration Types

export interface GHLIntegration {
  id: number;
  agent_id: number;
  ghl_location_id: string;
  ghl_company_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: Date;
  location_name?: string;
  company_name?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface GHLTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GHLUserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyId: string;
  companyName: string;
  locationId: string;
  locationName: string;
}

export interface GHLContact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address1: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  companyName: string;
  website: string;
  customField: Record<string, any>;
  tags: string[];
  source: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
}

export interface GHLContactCreate {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  companyName?: string;
  website?: string;
  customField?: Record<string, any>;
  tags?: string[];
  source?: string;
  assignedTo?: string;
}

export interface GHLContactUpdate extends Partial<GHLContactCreate> {
  id: string;
}

export interface GHLCustomField {
  id: string;
  name: string;
  type: string;
  required: boolean;
  options?: string[];
}

export interface GHLAPIError {
  message: string;
  status: number;
  error?: any;
} 