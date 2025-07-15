# Testing the Auth Redirect Feature

## Quick Test Guide

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Test URLs to Try

#### Valid Tests (should work):
```
http://localhost:3000/auth?email=test@example.com
http://127.0.0.1:3000/auth?email=admin@bbcore.com
```

#### Invalid Tests (should fail):
```
http://localhost:3000/auth (missing email)
http://localhost:3000/auth?email=invalid-email
http://localhost:3000/auth?email= (empty email)
```

### 3. Expected Behavior

#### Success Flow:
1. Page loads with loading spinner
2. Shows "Authentication successful!"
3. Automatically redirects to `/dashboard` after 2 seconds

#### Error Flow:
1. Page loads with error icon
2. Shows specific error message
3. Provides "Try Again" and "Go to Login Page" buttons

#### Invalid Domain Flow:
1. Page loads with warning icon
2. Shows "Access denied" message
3. Provides security notice and login link

### 4. Testing with Different Referrers

To test domain validation, you can:
1. Open browser dev tools
2. Navigate to a different domain first
3. Then try the auth URL

### 5. Database Requirements

Make sure you have a user in your database with the email you're testing:
```sql
INSERT INTO users (name, email, password) 
VALUES ('Test User', 'test@example.com', 'hashedpassword');
```

## Security Testing

### Test Domain Validation:
1. Try accessing from an unauthorized domain
2. Should show "Access denied" message

### Test Email Validation:
1. Try invalid email formats
2. Try non-existent emails
3. Should show appropriate error messages

## Integration Testing

### ManyChat Integration:
```javascript
// Simulate ManyChat redirect
const authUrl = `http://localhost:3000/auth?email=${encodeURIComponent('user@example.com')}`;
window.location.href = authUrl;
```

### External Application:
```javascript
// Test from external domain
// Note: This will be blocked unless domain is in ALLOWED_DOMAINS
const loginUrl = `http://localhost:3000/auth?email=user@example.com`;
```

## localStorage Testing

### Test URL Parameter Clearing:
1. Visit: `http://localhost:3000/auth?email=test@example.com`
2. Check that URL immediately changes to: `http://localhost:3000/auth`
3. Verify email is stored in localStorage

### Test localStorage Persistence:
1. Visit auth URL with email parameter
2. Refresh the page
3. Should still work (uses localStorage backup)

### Test localStorage Expiration:
```javascript
// In browser console
localStorage.setItem('bbcore_auth_email_expires', (Date.now() - 1000).toString())
// Refresh page - should show "Email parameter is required"
```

### Test localStorage Cleanup:
1. Visit auth URL
2. Check localStorage has email
3. After successful login or error, localStorage should be cleared 