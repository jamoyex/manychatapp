'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthForm } from '@/components/auth/authForm'
import { AuthLayout } from '@/components/auth/authLayout'
import { registerUser, validateRegistrationForm } from '@/lib/auth'

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (formData: Record<string, string>) => {
    setIsLoading(true)
    setError('')

    // Validate form
    const validation = validateRegistrationForm(formData)
    if (!validation.isValid) {
      setError(validation.errors[0])
      setIsLoading(false)
      return
    }

    try {
      await registerUser(formData.name, formData.email, formData.password)
      router.push('/dashboard')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  const registerFields = [
    {
      name: 'name',
      label: 'Full Name',
      type: 'text',
      placeholder: 'Enter your full name',
      required: true
    },
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
      placeholder: 'Create a password',
      required: true
    },
    {
      name: 'confirmPassword',
      label: 'Confirm Password',
      type: 'password',
      placeholder: 'Confirm your password',
      required: true
    }
  ]

  return (
    <AuthLayout
      title="Create account"
      description="Sign up for your BBCore AI Chatbot dashboard"
    >
      <AuthForm
        title="Create account"
        description="Sign up for your BBCore AI Chatbot dashboard"
        fields={registerFields}
        submitText="Create account"
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={error}
        footerText="Already have an account?"
        footerLink={{
          text: "Sign in",
          href: "/"
        }}
      />
    </AuthLayout>
  )
} 