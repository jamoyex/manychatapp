'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthForm } from '@/components/auth/authForm'
import { AuthLayout } from '@/components/auth/authLayout'
import { loginUser, validateLoginForm, sessionStorage } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const user = sessionStorage.getSession()
        if (user) {
          // User is authenticated, redirect to dashboard
          router.push('/dashboard')
          return
        }
      } catch (error) {
        console.warn('Auth check failed:', error)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [router])

  const handleSubmit = async (formData: Record<string, string>) => {
    setIsLoading(true)
    setError('')

    // Validate form
    const validation = validateLoginForm(formData)
    if (!validation.isValid) {
      setError(validation.errors[0])
      setIsLoading(false)
      return
    }

    try {
      await loginUser(formData.email, formData.password)
      router.push('/dashboard')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const loginFields = [
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'Enter your email',
      required: true
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      placeholder: 'Enter your password',
      required: true
    }
  ]

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <AuthLayout
        title="Welcome back"
        description="Checking authentication..."
      >
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500">Checking your authentication status...</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to your BBCore AI Chatbot dashboard"
    >
      <AuthForm
        title="Welcome back"
        description="Sign in to your BBCore AI Chatbot dashboard"
        fields={loginFields}
        submitText="Sign in"
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={error}
        footerText="Don't have an account?"
        footerLink={{
          text: "Sign up",
          href: "/register"
        }}
      />
    </AuthLayout>
  )
} 