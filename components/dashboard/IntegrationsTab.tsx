"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Link2, CheckCircle, AlertCircle, MessageSquare, Settings, Loader2 } from "lucide-react"
import { InstallManyChatModal } from "./InstallManyChatModal"

interface IntegrationsTabProps {
  agentId: number
  agentName: string
  agentIdString?: string
  userEmail?: string
  installLink?: string
  isInstalled?: boolean
  ghlConnected?: boolean
  onConnect?: () => void
}

interface ManyChatPageInfo {
  status: string
  data: {
    id: number
    name: string
    category: string
    avatar_link?: string
    username?: string
    about?: string
    description?: string
    is_pro: boolean
    timezone: string
  }
}

export function IntegrationsTab({ 
  agentId, 
  agentName, 
  agentIdString, 
  userEmail, 
  installLink, 
  isInstalled = false, 
  ghlConnected = false, 
  onConnect 
}: IntegrationsTabProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [connected, setConnected] = useState(ghlConnected)
  const [installModalOpen, setInstallModalOpen] = useState(false)
  const [manyChatPageInfo, setManyChatPageInfo] = useState<ManyChatPageInfo | null>(null)
  const [isLoadingPageInfo, setIsLoadingPageInfo] = useState(false)
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null)

  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

  // Fetch ManyChat page info when agent is installed
  useEffect(() => {
    if (isInstalled) {
      // Check if we have cached data that's still valid
      const now = Date.now()
      const isCacheValid = lastFetchTime && (now - lastFetchTime) < CACHE_DURATION
      
      if (!manyChatPageInfo || !isCacheValid) {
        fetchManyChatPageInfo()
      }
    }
  }, [isInstalled, agentId])

  const fetchManyChatPageInfo = async () => {
    setIsLoadingPageInfo(true)
    try {
      const response = await fetch(`/api/agents/${agentId}/manychat-page-info`)
      if (response.ok) {
        const data = await response.json()
        setManyChatPageInfo(data)
        setLastFetchTime(Date.now())
      } else {
        console.error('Failed to fetch ManyChat page info')
      }
    } catch (error) {
      console.error('Error fetching ManyChat page info:', error)
    } finally {
      setIsLoadingPageInfo(false)
    }
  }

  // Placeholder for actual OAuth flow
  const handleConnect = async () => {
    setIsConnecting(true)
    // TODO: Implement actual Go High Level OAuth
    setTimeout(() => {
      setConnected(true)
      setIsConnecting(false)
    }, 1500)
    onConnect?.()
  }

  const handleInstallClick = () => {
    setInstallModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* ManyChat Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>ManyChat Integration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Badge variant={isInstalled ? "default" : "secondary"}>
              {isInstalled ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Not Connected
                </>
              )}
            </Badge>
          </div>
          
          {/* Display ManyChat page info when connected */}
          {isInstalled && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              {isLoadingPageInfo ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-600">Loading page information...</span>
                </div>
              ) : manyChatPageInfo?.data ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Connected Page:</span>
                    <Badge variant="outline" className="text-xs">
                      {manyChatPageInfo.data.is_pro ? 'Pro' : 'Free'}
                    </Badge>
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {manyChatPageInfo.data.name}
                  </div>
                  {manyChatPageInfo.data.category && (
                    <div className="text-sm text-gray-600">
                      Category: {manyChatPageInfo.data.category}
                    </div>
                  )}
                  {manyChatPageInfo.data.timezone && (
                    <div className="text-sm text-gray-600">
                      Timezone: {manyChatPageInfo.data.timezone}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  Unable to load page information
                </div>
              )}
            </div>
          )}
          
          <p className="text-gray-600 text-sm">
            Connect your AI agent to ManyChat to enable automated messaging and customer engagement. Your agent will handle incoming messages and provide intelligent responses to your audience.
          </p>
          
          {!isInstalled && installLink ? (
            <Button
              type="button"
              onClick={handleInstallClick}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Install on ManyChat
            </Button>
          ) : isInstalled ? (
            <Button variant="outline" disabled className="w-full sm:w-auto">
              <CheckCircle className="w-4 h-4 mr-2" />
              Connected to ManyChat
            </Button>
          ) : (
            <Button disabled className="w-full sm:w-auto">
              <AlertCircle className="w-4 h-4 mr-2" />
              Installation Link Not Available
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Go High Level Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Link2 className="w-5 h-5" />
            <span>Go High Level Integration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Badge variant={connected ? "default" : "secondary"}>
              {connected ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Not Connected
                </>
              )}
            </Badge>
          </div>
          <p className="text-gray-600 text-sm">
            Connect your Go High Level account to enable advanced CRM and marketing automation features. Your tokens will be securely stored and used by our backend for integration.
          </p>
          <Button
            onClick={handleConnect}
            disabled={connected || isConnecting}
            className="w-full sm:w-auto"
          >
            {connected ? "Connected" : isConnecting ? "Connecting..." : "Connect Go High Level"}
          </Button>
        </CardContent>
      </Card>

      {/* Install ManyChat Modal */}
      {installLink && (
        <InstallManyChatModal
          isOpen={installModalOpen}
          onClose={() => setInstallModalOpen(false)}
          installLink={installLink}
          agentName={agentName}
          agentId={agentIdString}
          userEmail={userEmail}
        />
      )}
    </div>
  )
} 