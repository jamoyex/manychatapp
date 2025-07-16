'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loginUserByUUID, validateUUID } from '@/lib/auth'
import { AuthLayout } from '@/components/auth/authLayout'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { validateReferrer } from '@/lib/config'

function AuthRedirectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid-domain'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    handleAuthRedirect()
  }, [])

  const handleAuthRedirect = async () => {
    try {
      // Get UUID from URL parameter
      const uuidParam = searchParams.get('uuid')
      
      if (!uuidParam) {
        setStatus('error')
        setMessage('UUID parameter is required')
        return
      }

      // Validate UUID format
      if (!validateUUID(uuidParam)) {
        setStatus('error')
        setMessage('Invalid UUID format')
        return
      }

      // If UUID came from URL, clear it immediately for security
      if (searchParams.get('uuid')) {
        const url = new URL(window.location.href)
        url.search = ''
        window.history.replaceState({}, document.title, url.toString())
      }

      // Check referrer domain
      const referrer = document.referrer
      const currentDomain = window.location.hostname
      
      // Debug: Log referrer information for UUID auth
      console.log('UUID Auth Debug:', {
        referrer,
        currentDomain,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      })
      
      // Validate referrer using the config function
      const isAllowedReferrer = validateReferrer(referrer, currentDomain)

      if (!isAllowedReferrer) {
        setStatus('invalid-domain')
        setMessage('Unauthorized')
        return
      }

      // Attempt to log in with UUID
      await loginUserByUUID(uuidParam)
      
      setStatus('success')
      setMessage('Authentication successful! Redirecting to dashboard...')
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error) {
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
        return null // Icon is now shown inline with message
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
      description={
        status === 'loading' ? 'Processing your login request...' :
        status === 'success' ? 'Login successful!' :
        status === 'error' ? 'Authentication failed' :
        status === 'invalid-domain' ? 'Access denied' :
        'Processing your login request...'
      }
    >
      <div className="space-y-6">
        <div className="text-center space-y-4">
          {getStatusIcon()}
          
          {message && (
            <div className="flex items-center justify-center space-x-2">
              {status === 'error' || status === 'invalid-domain' ? (
                <AlertCircle className="h-4 w-4 text-red-600" />
              ) : null}
              <p className={`text-sm ${getStatusColor()}`}>
                {message}
              </p>
            </div>
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
      </div>
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
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-xs text-gray-500">
              Please wait while we load the authentication page...
            </p>
          </div>
        </div>
      </AuthLayout>
    }>
      <AuthRedirectContent />
    </Suspense>
  )
} 