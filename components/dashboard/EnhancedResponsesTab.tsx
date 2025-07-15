'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ExternalLink, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface EnhancedResponsesTabProps {
  agentId: number
  agent?: {
    enhanced_responses_enabled?: boolean
    template_installed?: boolean
    loader_enabled?: boolean
    gallery_enabled?: boolean
    quick_replies_enabled?: boolean
  }
  onAgentStateChange?: (agentUpdate: any) => void
}

export function EnhancedResponsesTab({ agentId, agent, onAgentStateChange }: EnhancedResponsesTabProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingInstallation, setIsCheckingInstallation] = useState(false)
  const [templateInstalled, setTemplateInstalled] = useState(agent?.template_installed || false)
  const [enhancedResponsesEnabled, setEnhancedResponsesEnabled] = useState(agent?.enhanced_responses_enabled || false)
  const [loaderEnabled, setLoaderEnabled] = useState(agent?.loader_enabled || false)
  const [galleryEnabled, setGalleryEnabled] = useState(agent?.gallery_enabled || false)
  const [quickRepliesEnabled, setQuickRepliesEnabled] = useState(agent?.quick_replies_enabled || false)

  const MANYCHAT_TEMPLATE_LINK = process.env.NEXT_PUBLIC_MANYCHAT_TEMPLATE_LINK || 'https://manychat.com/template/bbcore-enhanced-responses'

  const checkTemplateInstallation = async () => {
    setIsCheckingInstallation(true)
    try {
      const response = await fetch(`/api/agents/${agentId}/check-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const { installed } = await response.json()
        setTemplateInstalled(installed)
        if (installed) {
          toast.success('Template installation verified!')
        } else {
          toast.error('Template not found. Please install the template first.')
        }
      } else {
        toast.error('Failed to check template installation')
      }
    } catch (error) {
      toast.error('Error checking template installation')
    } finally {
      setIsCheckingInstallation(false)
    }
  }

  const updateFeatureStatus = async (feature: string, enabled: boolean) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/agents/${agentId}/enhanced-responses`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [feature]: enabled
        })
      })

      if (response.ok) {
        const { agent: updatedAgent } = await response.json()
        onAgentStateChange?.(updatedAgent)
        toast.success(`${feature.replace('_', ' ')} ${enabled ? 'enabled' : 'disabled'}`)
      } else {
        toast.error(`Failed to update ${feature}`)
      }
    } catch (error) {
      toast.error(`Error updating ${feature}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFeatureToggle = (feature: string, enabled: boolean) => {
    if (!templateInstalled) {
      toast.error('Please install the ManyChat template first')
      return
    }
    
    updateFeatureStatus(feature, enabled)
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
            <h3 className="text-lg font-semibold text-purple-900 mb-2">Interactive Messaging Templates</h3>
            <p className="text-purple-800 text-sm mb-3">
              Enhance your AI agent with interactive messaging capabilities including typing indicators, 
              gallery carousels, and quick reply buttons. These features require a ManyChat template installation.
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
              Click the button below to install the BBCore Enhanced Responses template in your ManyChat account. 
              This template includes all the interactive messaging flows you'll need.
            </p>
            <Button 
              onClick={() => window.open(MANYCHAT_TEMPLATE_LINK, '_blank')}
              className="w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Install ManyChat Template
            </Button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Step 2: Verify Installation</h4>
            <p className="text-gray-600 text-sm mb-4">
              After installing the template, click the button below to verify that the required flows 
              are present in your ManyChat account.
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

      {/* Feature Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive Features</CardTitle>
          <p className="text-sm text-gray-600">
            Enable these features to give your AI agent interactive messaging capabilities. 
            All features require the template to be installed first.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enhanced Responses Master Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <Label htmlFor="enhanced-responses" className="text-base font-medium">
                Enhanced Responses
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Master toggle for all interactive messaging features
              </p>
            </div>
            <Switch
              id="enhanced-responses"
              checked={enhancedResponsesEnabled}
              onCheckedChange={(enabled: boolean) => {
                setEnhancedResponsesEnabled(enabled)
                handleFeatureToggle('enhanced_responses_enabled', enabled)
              }}
              disabled={!templateInstalled || isLoading}
            />
          </div>

          {/* Individual Feature Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="loader" className="text-base font-medium">
                  Typing Indicators
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Show typing indicators to make conversations feel more natural
                </p>
              </div>
              <Switch
                id="loader"
                checked={loaderEnabled}
                onCheckedChange={(enabled: boolean) => {
                  setLoaderEnabled(enabled)
                  handleFeatureToggle('loader_enabled', enabled)
                }}
                disabled={!templateInstalled || !enhancedResponsesEnabled || isLoading}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="gallery" className="text-base font-medium">
                  Gallery Carousels
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Display products or services in interactive gallery format
                </p>
              </div>
              <Switch
                id="gallery"
                checked={galleryEnabled}
                onCheckedChange={(enabled: boolean) => {
                  setGalleryEnabled(enabled)
                  handleFeatureToggle('gallery_enabled', enabled)
                }}
                disabled={!templateInstalled || !enhancedResponsesEnabled || isLoading}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="quick-replies" className="text-base font-medium">
                  Quick Reply Buttons
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Provide clickable buttons for common responses
                </p>
              </div>
              <Switch
                id="quick-replies"
                checked={quickRepliesEnabled}
                onCheckedChange={(enabled: boolean) => {
                  setQuickRepliesEnabled(enabled)
                  handleFeatureToggle('quick_replies_enabled', enabled)
                }}
                disabled={!templateInstalled || !enhancedResponsesEnabled || isLoading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Information */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Loader2 className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Typing Indicators</h4>
              <p className="text-sm text-gray-600">
                Your AI will show typing indicators before responding, creating a more human-like experience
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <ExternalLink className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Gallery Carousels</h4>
              <p className="text-sm text-gray-600">
                Display multiple products or services in a swipeable gallery format
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Quick Replies</h4>
              <p className="text-sm text-gray-600">
                Provide clickable buttons for common responses to improve user engagement
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 