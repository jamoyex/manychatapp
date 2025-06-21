'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, ExternalLink, ArrowRight, Copy, Check, Settings, Mail, MessageSquare } from 'lucide-react'
import Image from 'next/image'

interface InstallManyChatModalProps {
  isOpen: boolean
  onClose: () => void
  installLink: string
  agentName: string
  agentId?: string
  userEmail?: string
}

const installationSteps = [
  {
    id: 1,
    title: "Access ManyChat",
    description: "Log into your ManyChat account or create a new one",
    icon: "🔗",
    details: "Go to manychat.com and sign in to your account",
    image: "/images/Screenshot 2025-06-21 at 4.46.09 PM.png",
    showImage: true
  },
  {
    id: 2,
    title: "Navigate to Apps",
    description: "Find the Apps section in your ManyChat dashboard",
    icon: "📱",
    details: "Click on 'Apps' in the left sidebar menu to access the app marketplace",
    image: "/images/Screenshot 2025-06-21 at 4.46.25 PM.png",
    showImage: true
  },
  {
    id: 3,
    title: "Install BBCore App",
    description: "Click the installation link to add BBCore to your ManyChat",
    icon: "⚡",
    details: "You'll be redirected to the BBCore app installation page. Click 'Install' to add the app to your ManyChat account.",
    image: "/images/Screenshot 2025-06-21 at 4.47.59 PM.png",
    showImage: true
  },
  {
    id: 4,
    title: "Authorize Access",
    description: "Grant necessary permissions to BBCore",
    icon: "🔐",
    details: "Click 'Authorize' to allow BBCore to access your ManyChat account and Facebook page",
    image: "/images/Screenshot 2025-06-21 at 4.48.56 PM.png",
    showImage: true
  },
  {
    id: 5,
    title: "Configure App Settings",
    description: "Set up your email and agent ID in the app settings",
    icon: "⚙️",
    details: "After installation, go to the app settings and enter your email address and agent ID for proper integration",
    image: "/images/Screenshot 2025-06-21 at 4.50.30 PM.png",
    showImage: true
  },
  {
    id: 6,
    title: "Set Default Reply",
    description: "Configure the default reply to use your AI agent",
    icon: "💬",
    details: "Go to Settings → Default Reply and add the 'Send message to your agent' action to handle all incoming messages",
    image: "/images/Screenshot 2025-06-21 at 4.50.50 PM.png",
    showImage: true
  }
]

export function InstallManyChatModal({ isOpen, onClose, installLink, agentName, agentId, userEmail }: InstallManyChatModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedAgentId, setCopiedAgentId] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(installLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const handleCopyAgentId = async () => {
    if (agentId) {
      try {
        await navigator.clipboard.writeText(agentId)
        setCopiedAgentId(true)
        setTimeout(() => setCopiedAgentId(false), 2000)
      } catch (error) {
        console.error('Failed to copy agent ID:', error)
      }
    }
  }

  const handleCopyEmail = async () => {
    if (userEmail) {
      try {
        await navigator.clipboard.writeText(userEmail)
        setCopiedEmail(true)
        setTimeout(() => setCopiedEmail(false), 2000)
      } catch (error) {
        console.error('Failed to copy email:', error)
      }
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

  const currentStepData = installationSteps[currentStep - 1]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
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
                <span className="text-3xl">{currentStepData.icon}</span>
                <div>
                  <CardTitle className="text-xl">
                    Step {currentStep}: {currentStepData.title}
                  </CardTitle>
                  <p className="text-gray-600 mt-1">
                    {currentStepData.description}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                {currentStepData.details}
              </p>
              
              {/* Screenshot */}
              {currentStepData.showImage && (
                <div className="mb-6">
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <Image
                      src={currentStepData.image}
                      alt={`Step ${currentStep} - ${currentStepData.title}`}
                      width={800}
                      height={600}
                      className="w-full h-auto rounded-lg border"
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                </div>
              )}

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

              {/* Special content for step 5 (configuration) */}
              {currentStep === 5 && (
                <div className="bg-white p-4 rounded-lg border space-y-4">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-800">App Configuration</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-600" />
                        <label className="text-sm font-medium text-gray-700">Email Address:</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-100 p-2 rounded text-sm font-mono">
                          {userEmail || 'your-email@example.com'}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCopyEmail}
                          disabled={!userEmail}
                        >
                          {copiedEmail ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4 text-gray-600" />
                        <label className="text-sm font-medium text-gray-700">Agent ID:</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-100 p-2 rounded text-sm font-mono">
                          {agentId || 'agent_xxxxx'}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCopyAgentId}
                          disabled={!agentId}
                        >
                          {copiedAgentId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Important:</strong> Enter these details in the BBCore app settings within ManyChat to establish the connection.
                    </p>
                  </div>
                </div>
              )}

              {/* Special content for step 6 (default reply) */}
              {currentStep === 6 && (
                <div className="bg-white p-4 rounded-lg border space-y-4">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-gray-800">Default Reply Configuration</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Step 1:</strong> Go to Settings → Default Reply in your ManyChat dashboard
                      </p>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        <strong>Step 2:</strong> Add the action "Send message to your agent" to handle all incoming messages
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <p className="text-sm text-purple-800">
                        <strong>Step 3:</strong> Make sure to set this as the default reply to send every time
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      <strong>✅ Success:</strong> Once configured, all messages to your Facebook page will be automatically routed to your AI agent!
                    </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  Double-check your email and agent ID in the app settings for proper integration
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <Badge variant="secondary" className="bg-yellow-200 text-yellow-800">Tip 3</Badge>
                <p className="text-sm text-yellow-800">
                  Test your bot by sending a message to your Facebook page after setup
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