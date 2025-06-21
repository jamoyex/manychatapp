'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'

interface CreateAgentModalProps {
  isOpen: boolean
  onClose: () => void
  onAgentCreated: (newAgent: any) => void
}

const STEPS = [
  { field: 'bot_name', title: 'Bot Name', question: 'What do you want to name your AI bot?', placeholder: 'e.g., Sales Assistant', type: 'input' },
  { field: 'company_name', title: 'Company Profile', question: 'What\'s your company\'s name?', placeholder: 'Your Company Inc.', type: 'input' },
  { field: 'industry', title: 'Company Profile', question: 'What industry are you in?', placeholder: 'e.g., E-commerce, SaaS', type: 'input' },
  { field: 'company_description', title: 'Company Profile', question: 'Describe your company in a few sentences.', placeholder: 'What it does, its mission, and values.', type: 'textarea' },
  { field: 'target_audience_description', title: 'AI Persona', question: 'Who is your target audience?', placeholder: 'e.g., Small business owners, developers.', type: 'textarea' },
  { field: 'tone_and_style_guide', title: 'AI Persona', question: 'Describe the desired tone and style for AI replies.', placeholder: 'e.g., Friendly and professional, witty and casual.', type: 'textarea' },
  { field: 'specific_instructions', title: 'AI Persona', question: 'Any other specific instructions for the AI?', placeholder: 'e.g., Always end with a question, never use emojis.', type: 'textarea' },
  { field: 'support_email_address', title: 'Support & Contact', question: 'What\'s your support email?', placeholder: 'e.g., support@example.com', type: 'input' },
];

const INITIAL_STATE: { [key: string]: string } = {
  bot_name: '',
  company_name: '',
  industry: '',
  company_description: '',
  target_audience_description: '',
  tone_and_style_guide: '',
  specific_instructions: '',
  support_email_address: ''
};

export function CreateAgentModal({ isOpen, onClose, onAgentCreated }: CreateAgentModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState(INITIAL_STATE)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const advanceToNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }
  
  const handleNext = () => {
    const currentField = STEPS[currentStep - 1].field
    if (currentField === 'bot_name' && formData.bot_name.trim() === '') {
      setError('The bot name is required to continue.')
      return
    }
    setError('')
    advanceToNext()
  }

  const handleSkip = () => {
    setError('')
    advanceToNext()
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setError('')
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (formData.bot_name.trim() === '') {
      setError('The bot name cannot be empty.')
      setCurrentStep(1)
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong')
      }
      
      onAgentCreated(result.agent)
      handleClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleClose = () => {
    setCurrentStep(1)
    setFormData(INITIAL_STATE)
    setError('')
    setIsSubmitting(false)
    onClose()
  }

  const progress = (currentStep / STEPS.length) * 100
  const stepData = STEPS[currentStep - 1]
  const isLastStep = currentStep === STEPS.length

  const renderStepContent = () => {
    const { field, question, placeholder, type } = stepData
    
    const commonProps = {
      id: field,
      name: field,
      value: formData[field],
      onChange: handleChange,
      placeholder: placeholder,
    }

    return (
      <div>
        <Label htmlFor={field} className="text-lg">{question}</Label>
        <div className="mt-2">
          {type === 'textarea' ? <Textarea {...commonProps} /> : <Input {...commonProps} />}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={!isSubmitting ? handleClose : undefined}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{stepData.title}</DialogTitle>
          <DialogDescription>
            Step {currentStep} of {STEPS.length}
          </DialogDescription>
          <Progress value={progress} className="w-full" />
        </DialogHeader>
        <div className="py-4 min-h-[150px] flex items-center">{renderStepContent()}</div>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <DialogFooter className="flex-col sm:flex-col sm:space-x-0">
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting || currentStep === 1}>Back</Button>
            
            <div className="flex gap-2">
              {currentStep > 1 && <Button variant="ghost" onClick={handleSkip} disabled={isSubmitting}>Skip</Button>}
              <Button onClick={isLastStep ? handleSubmit : handleNext} disabled={isSubmitting}>
                {isLastStep ? (isSubmitting ? 'Creating Agent...' : 'Finish & Create Agent') : 'Next'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 