'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AuthFormField {
  name: string
  label: string
  type: string
  placeholder: string
  required?: boolean
}

interface AuthFormProps {
  title: string
  description: string
  fields: AuthFormField[]
  submitText: string
  onSubmit: (formData: Record<string, string>) => Promise<void>
  isLoading: boolean
  error: string
  footerText: string
  footerLink: {
    text: string
    href: string
  }
}

export function AuthForm({
  title,
  description,
  fields,
  submitText,
  onSubmit,
  isLoading,
  error,
  footerText,
  footerLink
}: AuthFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({})

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>{field.label}</Label>
          <Input
            id={field.name}
            name={field.name}
            type={field.type}
            placeholder={field.placeholder}
            value={formData[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            required={field.required}
          />
        </div>
      ))}

      <Button 
        type="submit" 
        className="w-full" 
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : submitText}
      </Button>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          {footerText}{' '}
          <a href={footerLink.href} className="text-blue-600 hover:underline font-medium">
            {footerLink.text}
          </a>
        </p>
      </div>
    </form>
  )
} 