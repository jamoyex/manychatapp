'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, ExternalLink, ArrowRight, Copy, Check } from 'lucide-react'

interface InstallManyChatModalProps {
  isOpen: boolean
  onClose: () => void
  installLink: string
  agentName: string
}

const installationSteps = [
  {
    id: 1,
    title: "Access ManyChat",
    description: "Log into your ManyChat account or create a new one",
    icon: "🔗",
    details: "Go to manychat.com and sign in to your account"
  },
  {
    id: 2,
    title: "Navigate to Apps",
    description: "Find the Apps section in your ManyChat dashboard",
    icon: "📱",
    details: "Click on 'Apps' in the left sidebar menu"
  },
  {
    id: 3,
    title: "Install BBCore App",
    description: "Click the installation link to add BBCore to your ManyChat",
    icon: "⚡",
    details: "You'll be redirected to the BBCore app installation page"
  },
  {
    id: 4,
    title: "Authorize Access",
    description: "Grant necessary permissions to BBCore",
    icon: "🔐",
    details: "Click 'Authorize' to allow BBCore to access your ManyChat account"
  },
  {
    id: 5,
    title: "Configure Your Bot",
    description: "Set up your AI agent with your business details",
    icon: "🤖",
    details: "Follow the setup wizard to configure your chatbot"
  },
  {
    id: 6,
    title: "Test & Launch",
    description: "Test your bot and go live on your Facebook page",
    icon: "🚀",
    details: "Send a test message and activate your bot for your audience"
  }
]

export function InstallManyChatModal({ isOpen, onClose, installLink, agentName }: InstallManyChatModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [copiedLink, setCopiedLink] = useState(false)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(installLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const handleInstallClick = () => {
    window.open(installLink, '_blank')
    onClose()
  }

  const nextStep = () => {
    if (currentStep < installationSteps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Install {agentName} on ManyChat
          </DialogTitle>
          <p className="text-center text-gray-600 mt-2">
            Follow these steps to connect your AI agent to ManyChat and start engaging with your audience
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex justify-center">
            <div className="flex space-x-2">
              {installationSteps.map((step) => (
                <div
                  key={step.id}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    step.id <= currentStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Current Step */}
          <Card className="border-2 border-blue-100 bg-blue-50">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{installationSteps[currentStep - 1].icon}</span>
                <div>
                  <CardTitle className="text-xl">
                    Step {currentStep}: {installationSteps[currentStep - 1].title}
                  </CardTitle>
                  <p className="text-gray-600 mt-1">
                    {installationSteps[currentStep - 1].description}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                {installationSteps[currentStep - 1].details}
              </p>
              
              {/* Special content for step 3 (installation link) */}
              {currentStep === 3 && (
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-2">Installation Link:</p>
                      <div className="bg-gray-100 p-3 rounded text-sm font-mono break-all">
                        {installLink}
                      </div>
                    </div>
                    <div className="ml-4 space-y-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyLink}
                        className="w-full"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleInstallClick}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Install Now
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step navigation */}
              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  Previous
                </Button>
                
                <div className="flex space-x-2">
                  {currentStep < installationSteps.length ? (
                    <Button onClick={nextStep}>
                      Next Step
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Got it!
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Steps Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {installationSteps.map((step) => (
              <Card
                key={step.id}
                className={`cursor-pointer transition-all ${
                  step.id === currentStep
                    ? 'border-blue-300 bg-blue-50'
                    : step.id < currentStep
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200'
                }`}
                onClick={() => setCurrentStep(step.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step.id === currentStep
                        ? 'bg-blue-600 text-white'
                        : step.id < currentStep
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {step.id < currentStep ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{step.title}</h4>
                      <p className="text-xs text-gray-600">{step.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tips Section */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-lg text-yellow-800">💡 Pro Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start space-x-2">
                <Badge variant="secondary" className="bg-yellow-200 text-yellow-800">Tip 1</Badge>
                <p className="text-sm text-yellow-800">
                  Make sure you have admin access to your Facebook page before installing
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <Badge variant="secondary" className="bg-yellow-200 text-yellow-800">Tip 2</Badge>
                <p className="text-sm text-yellow-800">
                  Test your bot in development mode before going live
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <Badge variant="secondary" className="bg-yellow-200 text-yellow-800">Tip 3</Badge>
                <p className="text-sm text-yellow-800">
                  Keep your ManyChat account active to maintain bot functionality
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleInstallClick} className="bg-blue-600 hover:bg-blue-700">
              <ExternalLink className="w-4 h-4 mr-2" />
              Install on ManyChat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 