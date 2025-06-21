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

const steps = [
  {
    title: "Let's Start with the Basics",
    description: "Every great AI needs a name and a purpose.",
    fields: [
      { name: "bot_name", label: "What's your AI's name?", type: "text", placeholder: "e.g., Sales Bot" },
      { name: "company_name", label: "What's your company name?", type: "text", placeholder: "e.g., ACME Inc." },
      { name: "industry", label: "And your industry?", type: "text", placeholder: "e.g., E-commerce" },
    ],
  },
  {
    title: "About Your Company",
    description: "Help your AI understand where it works.",
    fields: [
      { name: "company_location", label: "Where are you located?", type: "text", placeholder: "e.g., New York, NY" },
      { name: "company_phone_number", label: "Company phone number?", type: "text", placeholder: "+1 (555) 123-4567" },
      { name: "website_url", label: "Your website URL?", type: "text", placeholder: "https://www.example.com" },
    ],
  },
  {
    title: "Your AI's Mission",
    description: "What is the primary goal for this agent?",
    fields: [
      { name: "bot_primary_goal", label: "What is the AI's main goal?", type: "textarea", placeholder: "e.g., To book appointments for our sales team." },
      { name: "product_or_service_you_sell", label: "What's your main product/service?", type: "textarea", placeholder: "e.g., We sell high-quality, handcrafted leather goods." },
    ],
  },
  {
    title: "Fine-Tuning the Details",
    description: "A little more info goes a long way.",
    fields: [
      { name: "details_about_product_or_service", label: "Tell me more about the products/services.", type: "textarea", placeholder: "Provide key features, benefits, and pricing." },
      { name: "purchase_book_appointments_here", label: "Where should the AI send people to buy or book?", type: "text", placeholder: "e.g., https://cal.com/example" },
    ],
  },
  {
    title: "AI Personality",
    description: "How should your AI sound? Who does it represent?",
    fields: [
      { name: "bot_tone_for_replies", label: "Describe the desired tone.", type: "text", placeholder: "e.g., Friendly, helpful, and slightly witty" },
      { name: "leader_full_name", label: "Who is the leader/face of the company?", type: "text", placeholder: "e.g., Jane Doe" },
      { name: "details_about_leader", label: "Tell me about this leader.", type: "textarea", placeholder: "e.g., Jane is the founder and a 20-year expert in the industry..." },
      { name: "details_about_company", label: "Any other company details?", type: "textarea", placeholder: "e.g., We are a family-owned business dedicated to sustainability." },
    ],
  },
  {
    title: "Support & Contact",
    description: "How can customers reach you for support?",
    fields: [
        { name: "support_email_address", label: "What's your support email?", type: "text", placeholder: "e.g., support@example.com" },
    ],
  },
];

export function CreateAgentModal({ isOpen, onClose, onAgentCreated }: CreateAgentModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleNext = () => {
    // Here you could add validation for the current step's fields
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      onAgentCreated(data.agent);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{steps[currentStep].title}</DialogTitle>
          <DialogDescription>{steps[currentStep].description}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Progress value={progress} className="w-full mb-8" />
          <div className="space-y-4">
            {steps[currentStep].fields.map((field) => (
              <div key={field.name} className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={field.name} className="text-right">
                  {field.label}
                </Label>
                {field.type === 'textarea' ? (
                   <Textarea
                    id={field.name}
                    name={field.name}
                    placeholder={field.placeholder}
                    onChange={handleChange}
                    className="col-span-3"
                  />
                ) : (
                  <Input
                    id={field.name}
                    name={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    onChange={handleChange}
                    className="col-span-3"
                  />
                )}
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
        </div>

        <DialogFooter>
          {currentStep > 0 && <Button variant="outline" onClick={handleBack}>Back</Button>}
          {isLastStep ? (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Creating Agent...' : 'Finish & Create Agent'}
            </Button>
          ) : (
            <Button onClick={handleNext}>Next</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 