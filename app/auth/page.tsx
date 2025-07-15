'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loginUserByEmail, loginUserByUUID, validateEmail, validateUUID, authStorage } from '@/lib/auth'
import { AuthLayout } from '@/components/auth/authLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { validateReferrer } from '@/lib/config'

function AuthRedirectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid-domain'>('loading')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    handleAuthRedirect()
  }, [])

  const handleAuthRedirect = async () => {
    try {
      // Get email or UUID from URL parameter or localStorage
      let emailParam = searchParams.get('email')
      let uuidParam = searchParams.get('uuid')
      
      // If no parameters in URL, check localStorage
      if (!emailParam && !uuidParam) {
        emailParam = authStorage.getEmail()
        if (!emailParam) {
          setStatus('error')
          setMessage('Email or UUID parameter is required')
          return
        }
      }

      // Handle email authentication
      if (emailParam) {
        // Validate email format
        if (!validateEmail(emailParam)) {
          setStatus('error')
          setMessage('Invalid email format')
          return
        }

        setEmail('') // Don't display email in UI for security

        // If email came from URL, clear it immediately for security
        if (searchParams.get('email')) {
          const url = new URL(window.location.href)
          url.search = ''
          window.history.replaceState({}, document.title, url.toString())
          
          // Save email to localStorage for session management
          authStorage.saveEmail(emailParam)
        }

        // Check referrer domain
        const referrer = document.referrer
        const currentDomain = window.location.hostname
        
        // Validate referrer using the config function
        const isAllowedReferrer = validateReferrer(referrer, currentDomain)

        if (!isAllowedReferrer) {
          setStatus('invalid-domain')
          setMessage(`Access denied. This authentication link can only be accessed from authorized domains.`)
          return
        }

        // Attempt to log in with email
        await loginUserByEmail(emailParam)
      }

      // Handle UUID authentication
      if (uuidParam) {
        // Validate UUID format
        if (!validateUUID(uuidParam)) {
          setStatus('error')
          setMessage('Invalid UUID format')
          return
        }

        setEmail('') // Don't display UUID in UI for security

        // If UUID came from URL, clear it immediately for security
        if (searchParams.get('uuid')) {
          const url = new URL(window.location.href)
          url.search = ''
          window.history.replaceState({}, document.title, url.toString())
        }

        // Check referrer domain
        const referrer = document.referrer
        const currentDomain = window.location.hostname
        
        // Validate referrer using the config function
        const isAllowedReferrer = validateReferrer(referrer, currentDomain)

        if (!isAllowedReferrer) {
          setStatus('invalid-domain')
          setMessage(`Access denied. This authentication link can only be accessed from authorized domains.`)
          return
        }

        // Attempt to log in with UUID
        await loginUserByUUID(uuidParam)
      }
      
      // Clear localStorage after successful login
      authStorage.clearEmail()
      
      setStatus('success')
      setMessage('Authentication successful! Redirecting to dashboard...')
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error) {
      // Clear localStorage on error
      authStorage.clearEmail()
      
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Authentication failed')
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />
      case 'error':
      case 'invalid-domain':
        return <AlertCircle className="h-8 w-8 text-red-600" />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-600'
      case 'success':
        return 'text-green-600'
      case 'error':
      case 'invalid-domain':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const handleRetry = () => {
    setStatus('loading')
    setMessage('')
    handleAuthRedirect()
  }

  const handleGoToLogin = () => {
    router.push('/')
  }

  return (
    <AuthLayout
      title="Authentication"
      description="Processing your login request"
    >
      <Card className="shadow-xl">
        <CardHeader className="space-y-1">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">BB</span>
            </div>
            <CardTitle className="text-2xl font-bold">Authentication</CardTitle>
            <CardDescription>
              {status === 'loading' && 'Processing your login request...'}
              {status === 'success' && 'Login successful!'}
              {status === 'error' && 'Authentication failed'}
              {status === 'invalid-domain' && 'Access denied'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            {getStatusIcon()}
            

            
            {message && (
              <p className={`text-sm ${getStatusColor()}`}>
                {message}
              </p>
            )}
          </div>

          {status === 'error' && (
            <div className="space-y-3">
              <Button 
                onClick={handleRetry} 
                className="w-full"
                variant="outline"
              >
                Try Again
              </Button>
              <Button 
                onClick={handleGoToLogin} 
                className="w-full"
              >
                Go to Login Page
              </Button>
            </div>
          )}

          {status === 'invalid-domain' && (
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Security Notice:</strong> This authentication link can only be accessed from authorized domains for security reasons.
                </p>
              </div>
              <Button 
                onClick={handleGoToLogin} 
                className="w-full"
              >
                Go to Login Page
              </Button>
            </div>
          )}

          {status === 'loading' && (
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Please wait while we authenticate your account...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}

export default function AuthRedirectPage() {
  return (
    <Suspense fallback={
      <AuthLayout
        title="Authentication"
        description="Loading..."
      >
        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">BB</span>
              </div>
              <CardTitle className="text-2xl font-bold">Authentication</CardTitle>
              <CardDescription>Loading...</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-xs text-gray-500">
                Please wait while we load the authentication page...
              </p>
            </div>
          </CardContent>
        </Card>
      </AuthLayout>
    }>
      <AuthRedirectContent />
    </Suspense>
  )
} 