"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Link2, CheckCircle, AlertCircle, MessageSquare, Settings, Loader2 } from "lucide-react"
import { InstallManyChatModal } from "./InstallManyChatModal"
import { toast } from 'sonner'

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

interface GHLStatus {
  connected: boolean
  locationName?: string
  companyName?: string
  expiresAt?: string
  isExpired?: boolean
  message?: string
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
  const [ghlStatus, setGhlStatus] = useState<GHLStatus>({ connected: ghlConnected })
  const [isLoadingGHLStatus, setIsLoadingGHLStatus] = useState(false)
  const [installModalOpen, setInstallModalOpen] = useState(false)
  const [manyChatPageInfo, setManyChatPageInfo] = useState<ManyChatPageInfo | null>(null)
  const [isLoadingPageInfo, setIsLoadingPageInfo] = useState(false)
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null)
  const [isTestingGHL, setIsTestingGHL] = useState(false)

  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

  // Fetch GHL connection status
  useEffect(() => {
    fetchGHLStatus()
  }, [agentId])

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

  const fetchGHLStatus = async () => {
    setIsLoadingGHLStatus(true)
    try {
      console.log('Fetching GHL status for agent:', agentId)
      const response = await fetch(`/api/connect/status?agentId=${agentId}`)
      console.log('GHL status response:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('GHL status data:', data)
        setGhlStatus(data)
      } else {
        console.error('Failed to fetch GHL status:', response.status)
        setGhlStatus({ connected: false })
      }
    } catch (error) {
      console.error('Error fetching GHL status:', error)
      setGhlStatus({ connected: false })
    } finally {
      setIsLoadingGHLStatus(false)
    }
  }

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

  const handleGHLConnect = async () => {
    setIsConnecting(true)
    try {
      console.log('Initiating GHL OAuth for agent:', agentId)
      const response = await fetch('/api/connect/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId }),
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('GHL OAuth URL:', data.oauthUrl)
        
        // Open GHL OAuth in popup window
        const popup = window.open(
          data.oauthUrl,
          'ghl-oauth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        )
        
        // Check if popup was blocked
        if (!popup) {
          console.error('Popup was blocked by browser')
          toast.error('Please allow popups for this site to connect to Go High Level')
          setIsConnecting(false)
          return
        }
        
        // Listen for popup close or message
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed)
            setIsConnecting(false)
            // Refresh status after popup closes
            fetchGHLStatus()
          }
        }, 1000)
        
        // Listen for message from popup (if callback page sends a message)
        window.addEventListener('message', (event) => {
          if (event.origin !== window.location.origin) return
          
          if (event.data.type === 'GHL_OAUTH_SUCCESS') {
            clearInterval(checkClosed)
            popup.close()
            setIsConnecting(false)
            fetchGHLStatus()
            toast.success('Successfully connected to Go High Level!')
          } else if (event.data.type === 'GHL_OAUTH_ERROR') {
            clearInterval(checkClosed)
            popup.close()
            setIsConnecting(false)
            toast.error('Failed to connect to Go High Level')
          }
        })
      } else {
        console.error('Failed to get GHL OAuth URL:', response.status)
        setIsConnecting(false)
      }
    } catch (error) {
      console.error('Error connecting to GHL:', error)
      setIsConnecting(false)
    }
  }

  const handleGHLDisconnect = async () => {
    try {
      const response = await fetch('/api/connect/disconnect', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId }),
      })
      
      if (response.ok) {
        setGhlStatus({ connected: false })
        onConnect?.()
      }
    } catch (error) {
      console.error('Error disconnecting from GHL:', error)
    }
  }

  const handleGHLTest = async () => {
    setIsTestingGHL(true)
    try {
      const response = await fetch('/api/connect/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId }),
      })
      
      if (response.ok) {
        const data = await response.json()
        toast.success(`GHL API test successful! Location: ${data.locationName}`)
        console.log('GHL test result:', data)
      } else {
        const error = await response.json()
        if (error.needsReconnect) {
          toast.error('Token expired. Please reconnect your GHL integration.')
          fetchGHLStatus()
        } else {
          toast.error(`GHL API test failed: ${error.error}`)
        }
      }
    } catch (error) {
      console.error('Error testing GHL:', error)
      toast.error('Failed to test GHL connection')
    } finally {
      setIsTestingGHL(false)
    }
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
            {isLoadingGHLStatus ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-gray-600">Checking connection...</span>
              </div>
            ) : (
              <Badge variant={ghlStatus.connected ? "default" : "secondary"}>
                {ghlStatus.connected ? (
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
            )}
          </div>

          {/* Display GHL connection info when connected */}
          {ghlStatus.connected && ghlStatus.companyName && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Account Name:</span>
                  <span className="text-sm text-gray-900">{ghlStatus.companyName}</span>
                </div>
              </div>
            </div>
          )}
          
          <p className="text-gray-600 text-sm">
            Connect your Go High Level account to enable advanced CRM and marketing automation features. Your tokens will be securely stored and used by our backend for integration.
          </p>
          
          <div className="flex space-x-2">
            {ghlStatus.connected ? (
              <>
                <Button
                  onClick={handleGHLTest}
                  disabled={isTestingGHL}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  {isTestingGHL ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test API"
                  )}
                </Button>
                <Button
                  onClick={handleGHLDisconnect}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                onClick={handleGHLConnect}
                disabled={isConnecting}
                className="w-full sm:w-auto"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect Go High Level"
                )}
              </Button>
            )}
          </div>
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