"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Link2, CheckCircle, AlertCircle } from "lucide-react"

interface IntegrationsTabProps {
  agentId: number
  ghlConnected?: boolean
  onConnect?: () => void
}

export function IntegrationsTab({ agentId, ghlConnected = false, onConnect }: IntegrationsTabProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [connected, setConnected] = useState(ghlConnected)

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

  return (
    <div className="space-y-6">
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
    </div>
  )
} 