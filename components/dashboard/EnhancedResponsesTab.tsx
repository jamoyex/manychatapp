'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ExternalLink, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface EnhancedResponsesTabProps {
  agentId: number
  agent?: {
    typing_indicator_flow?: string
  }
  onAgentStateChange?: (agentUpdate: any) => void
}

export function EnhancedResponsesTab({ agentId, agent, onAgentStateChange }: EnhancedResponsesTabProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingInstallation, setIsCheckingInstallation] = useState(false)
  const [isCheckingAppInstallation, setIsCheckingAppInstallation] = useState(true)
  const [appInstallationError, setAppInstallationError] = useState<string | null>(null)
  const [templateInstalled, setTemplateInstalled] = useState(!!agent?.typing_indicator_flow)

  const MANYCHAT_TEMPLATE_LINK = process.env.NEXT_PUBLIC_MANYCHAT_ENHANCED_RESPONSES

  // Update templateInstalled state when agent data changes
  useEffect(() => {
    setTemplateInstalled(!!agent?.typing_indicator_flow)
  }, [agent?.typing_indicator_flow])

  // Check if ManyChat app is installed
  useEffect(() => {
    const checkAppInstallation = async () => {
      setIsCheckingAppInstallation(true)
      setAppInstallationError(null)
      try {
        const response = await fetch(`/api/agents/${agentId}/manychat-flows`)
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'ManyChat app not connected')
        }
        const data = await response.json()
        if (data.status !== 'success') {
          throw new Error('ManyChat app not properly connected')
        }
      } catch (error: any) {
        setAppInstallationError(error.message)
      } finally {
        setIsCheckingAppInstallation(false)
      }
    }

    checkAppInstallation()
  }, [agentId])

  const checkTemplateInstallation = async () => {
    if (appInstallationError) {
      toast.error('Please connect to ManyChat first before checking template installation')
      return
    }

    setIsCheckingInstallation(true)
    try {
      // First, get all flows from ManyChat
      const flowsResponse = await fetch(`/api/agents/${agentId}/manychat-flows`)
      if (!flowsResponse.ok) {
        throw new Error('Failed to fetch ManyChat flows')
      }
      
      const flowsData = await flowsResponse.json()
      if (flowsData.status !== 'success' || !flowsData.data?.flows) {
        throw new Error('Invalid flows response from ManyChat')
      }

      // Look for the "(AI) Typing Indicators" flow
      const typingIndicatorFlow = flowsData.data.flows.find(
        (flow: any) => flow.name === '(AI) Typing Indicators'
      )

      if (typingIndicatorFlow) {
        // Save the flow ID to the database
        const saveResponse = await fetch(`/api/agents/${agentId}/typing-indicator-flow`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flowId: typingIndicatorFlow.ns
          })
        })

        if (!saveResponse.ok) {
          throw new Error('Failed to save typing indicator flow ID')
        }

        const { agent: updatedAgent } = await saveResponse.json()
        onAgentStateChange?.(updatedAgent)
        
        setTemplateInstalled(true)
        toast.success('Typing Indicators template found and configured!')
      } else {
        setTemplateInstalled(false)
        toast.error('Typing Indicators template not found. Please install the template with a flow named "(AI) Typing Indicators".')
      }
    } catch (error: any) {
      console.error('Template check error:', error)
      toast.error(error.message || 'Error checking template installation')
      setTemplateInstalled(false)
    } finally {
      setIsCheckingInstallation(false)
    }
  }

  // Show loading state while checking app installation
  if (isCheckingAppInstallation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Checking ManyChat connection...</span>
        </div>
      </div>
    )
  }

  // Show error state if app is not installed
  if (appInstallationError) {
    return (
      <div className="space-y-6">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-destructive/20 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-destructive mb-2">ManyChat App Required</h3>
              <p className="text-destructive/80 text-sm mb-3">
                Enhanced responses require your AI agent to be connected to ManyChat first. 
                Please install and connect your agent to ManyChat before accessing this feature.
              </p>
              <p className="text-destructive/70 text-xs mb-4">
                Error: {appInstallationError}
              </p>
              <p className="text-destructive/80 text-sm">
                → Go to the <strong>Integrations</strong> tab to connect your agent to ManyChat.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Information */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <ExternalLink className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">Typing Indicators Template</h3>
            <p className="text-purple-800 text-sm mb-3">
              Enhance your AI agent with typing indicators to make conversations feel more natural. 
              This feature requires a ManyChat template installation.
            </p>
            <div className="flex items-center space-x-2">
              <Badge variant={templateInstalled ? "default" : "secondary"}>
                {templateInstalled ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Template Installed
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Template Required
                  </>
                )}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Template Installation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="w-5 h-5" />
            <span>ManyChat Template Installation</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Step 1: Install the Template</h4>
            <p className="text-gray-600 text-sm mb-4">
              Click the button below to install the BBCore Typing Indicators template in your ManyChat account. 
              This template includes the flows needed for typing indicator functionality.
            </p>
            <Button 
              onClick={() => {
                if (!MANYCHAT_TEMPLATE_LINK) {
                  toast.error('Template link not configured. Please contact support.')
                  return
                }
                window.open(MANYCHAT_TEMPLATE_LINK, '_blank')
              }}
              className="w-full sm:w-auto"
              disabled={!MANYCHAT_TEMPLATE_LINK}
            >
              <Download className="w-4 h-4 mr-2" />
              {MANYCHAT_TEMPLATE_LINK ? 'Install ManyChat Template' : 'Template Link Not Available'}
            </Button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Step 2: Verify Installation</h4>
            <p className="text-gray-600 text-sm mb-4">
              After installing the template, click the button below to verify that a flow named "(AI) Typing Indicators" 
              is present in your ManyChat account.
            </p>
            <Button 
              variant="outline"
              onClick={checkTemplateInstallation}
              disabled={isCheckingInstallation}
              className="w-full sm:w-auto"
            >
              {isCheckingInstallation ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify Installation
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Typing Indicators Control */}
      <Card>
        <CardHeader>
          <CardTitle>Typing Indicators</CardTitle>
          <p className="text-sm text-gray-600">
            Enable typing indicators to give your AI agent a more natural conversation flow. 
            This feature requires the template to be installed first.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Typing Indicators Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <Label className="text-base font-medium">
                Typing Indicators Status
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                {templateInstalled 
                  ? `✅ Typing indicators flow detected and configured${agent?.typing_indicator_flow ? ` (Flow ID: ${agent.typing_indicator_flow})` : ''}` 
                  : "❌ Install the template with '(AI) Typing Indicators' flow to enable this feature"
                }
              </p>
            </div>
            <Badge variant={templateInstalled ? "default" : "secondary"}>
              {templateInstalled ? "Configured" : "Not Configured"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Feature Information */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <div className="text-center p-6 border rounded-lg max-w-md">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-3">Typing Indicators</h4>
              <p className="text-sm text-gray-600">
                Your AI will show typing indicators before responding, creating a more human-like experience that makes conversations feel natural and engaging.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 