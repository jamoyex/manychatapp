'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthForm } from '@/components/auth/authForm'
import { AuthLayout } from '@/components/auth/authLayout'
import { loginUser, validateLoginForm } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

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