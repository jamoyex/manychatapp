# Public GHL Custom Fields API

This endpoint allows you to retrieve Go High Level custom fields for a specific agent without authentication.

## Endpoint

```
GET /api/public/ghl/custom-fields/{agentId}
```

## Parameters

### Path Parameters
- `agentId` (required): The ID of the agent to get custom fields for

### Query Parameters
- `model` (optional): The type of custom fields to retrieve
  - `contact` - Only contact custom fields
  - `opportunity` - Only opportunity custom fields  
  - `all` - All custom fields (default)

## Examples

### Get all custom fields for agent 4
```
GET /api/public/ghl/custom-fields/4
```

### Get only contact custom fields for agent 4
```
GET /api/public/ghl/custom-fields/4?model=contact
```

### Get only opportunity custom fields for agent 4
```
GET /api/public/ghl/custom-fields/4?model=opportunity
```

## Response Format

### Success Response (200)
```json
{
  "success": true,
  "agentId": 4,
  "model": "all",
  "customFields": [
    {
      "id": "3sv6UEo51C9Bmpo1cKTq",
      "name": "pincode",
      "fieldKey": "contact.pincode",
      "placeholder": "Pin code",
      "dataType": "TEXT",
      "position": 0,
      "picklistOptions": ["first option"],
      "picklistImageOptions": [],
      "isAllowedCustomOption": false,
      "isMultiFileAllowed": true,
      "maxFileLimit": 4,
      "locationId": "3sv6UEo51C9Bmpo1cKTq",
      "model": "contact"
    }
  ],
  "count": 1
}
```

### Error Responses

#### No GHL Integration Found (404)
```json
{
  "error": "No GHL integration found for this agent"
}
```

#### Inactive Integration (400)
```json
{
  "error": "GHL integration is not active for this agent"
}
```

#### Invalid Model Parameter (400)
```json
{
  "error": "Invalid model parameter. Must be: contact, opportunity, or all"
}
```

#### Server Error (500)
```json
{
  "error": "GHL API call failed: [error details]",
  "needsReconnect": false
}
```

## Features

- ✅ **No Authentication Required**: Public endpoint accessible without login
- ✅ **Automatic Token Refresh**: Handles expired tokens automatically
- ✅ **Model Filtering**: Filter by contact, opportunity, or get all fields
- ✅ **Error Handling**: Comprehensive error responses
- ✅ **Real-time Data**: Always fetches fresh data from GHL

## Usage Notes

- The agent must have an active GHL integration
- The endpoint automatically handles token refresh if needed
- If the GHL integration is inactive, the endpoint will return an error
- The response includes a count of custom fields for easy processing 