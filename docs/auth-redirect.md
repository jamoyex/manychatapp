# Email-Based Authentication Redirect

This feature allows users to be automatically logged in using just their email address through a secure redirect URL.

## How It Works

The authentication redirect page (`/auth`) accepts an email parameter and validates the request based on:

1. **Email Parameter**: Must be provided and valid format
2. **Referrer Domain**: Must come from an authorized domain
3. **User Existence**: User must exist in the database

## Usage

### Basic Usage
```
https://yourdomain.com/auth?email=user@example.com
```

### Example URLs
```
# Valid examples
https://bbcore.com/auth?email=john@company.com
https://app.bbcore.ai/auth?email=admin@example.com

# Invalid examples (will be blocked)
https://bbcore.com/auth?email=invalid-email
https://bbcore.com/auth (missing email)
```

## Security Features

### Domain Validation
Only requests from authorized domains are allowed. Configured domains include:
- `localhost` (development)
- `bbcore.com`
- `bbcore.ai`
- `manychat.com`
- `manychat.io`
- Your custom domains

### Email Validation
- Must be a valid email format
- User must exist in the database
- No password required (email-only authentication)

### URL Security
- **Immediate Parameter Clearing**: Email parameter is removed from URL immediately upon page load
- **localStorage Backup**: Email is temporarily stored in localStorage with 24-hour expiration
- **Automatic Cleanup**: localStorage is cleared after successful login or on errors
- **Refresh Protection**: Page works even after refresh (uses localStorage backup)

## Configuration

### Adding Allowed Domains
Edit `lib/config.ts` to add or remove allowed domains:

```typescript
export const AUTH_CONFIG = {
  ALLOWED_DOMAINS: [
    'localhost',
    '127.0.0.1',
    'bbcore.com',
    'bbcore.ai',
    'manychat.com',
    'manychat.io',
    'yourdomain.com', // Add your domains here
  ],
  // ... other settings
}
```

### Security Settings
```typescript
SECURITY: {
  MAX_REDIRECT_DELAY: 3000,        // Max delay before redirect
  ALLOW_DIRECT_ACCESS: true,       // Allow direct URL access
  LOG_AUTH_ATTEMPTS: true,         // Log authentication attempts
}
```

## Integration Examples

### ManyChat Integration
```javascript
// In ManyChat flow
const authUrl = `https://bbcore.com/auth?email=${user.email}`;
// Redirect user to authUrl
```

### External Application
```javascript
// From your external application
const loginUrl = `https://bbcore.com/auth?email=${encodeURIComponent(userEmail)}`;
window.location.href = loginUrl;
```

## User Experience

1. **Loading State**: Shows spinner while processing
2. **Success**: Automatically redirects to dashboard
3. **Error**: Shows error message with retry option
4. **Invalid Domain**: Shows security notice with login link

## API Endpoint

The feature uses a new API endpoint:
- **POST** `/api/auth/login-email`
- **Body**: `{ "email": "user@example.com" }`
- **Response**: User data and session creation

## localStorage Management

The system uses localStorage for secure session management:

### Storage Keys
- `bbcore_auth_email`: Stores the email address
- `bbcore_auth_email_expires`: Stores expiration timestamp (24 hours)

### Automatic Cleanup
- Cleared after successful authentication
- Cleared on authentication errors
- Expires after 24 hours
- Handles localStorage unavailability gracefully

### Utility Functions
```typescript
import { authStorage } from '@/lib/auth'

// Save email with expiration
authStorage.saveEmail('user@example.com')

// Get email if valid and not expired
const email = authStorage.getEmail()

// Clear stored email
authStorage.clearEmail()

// Check if valid email exists
const hasEmail = authStorage.hasValidEmail()
```

## Security Considerations

- ✅ Domain validation prevents unauthorized access
- ✅ Email format validation
- ✅ User existence verification
- ✅ Session-based authentication
- ✅ URL parameters immediately cleared for security
- ✅ localStorage with expiration for session management
- ✅ Automatic cleanup of sensitive data
- ⚠️ No password required (email-only)
- ⚠️ Should be used with additional security measures

## Troubleshooting

### Common Issues

1. **"Email parameter is required"**
   - Make sure to include `?email=user@example.com` in the URL

2. **"Invalid email format"**
   - Check that the email follows standard format (user@domain.com)

3. **"Access denied"**
   - Request must come from an authorized domain
   - Check the referrer header

4. **"User not found"**
   - User must exist in the database
   - Check email spelling

### Testing

For development testing:
```bash
# Test with localhost
http://localhost:3000/auth?email=test@example.com

# Test with specific domain
https://yourdomain.com/auth?email=test@example.com
```

## Future Enhancements

- [ ] Add rate limiting
- [ ] Implement token-based authentication
- [ ] Add audit logging
- [ ] Support for additional parameters (redirect URL, etc.)
- [ ] Integration with OAuth providers 