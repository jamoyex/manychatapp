'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Globe, ExternalLink, CheckCircle, AlertTriangle, Copy, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

interface WebsiteWidgetTabProps {
  agentId: number
  agentName: string
  agentIdString?: string
}

export function WebsiteWidgetTab({ agentId, agentName, agentIdString }: WebsiteWidgetTabProps) {
  const embedCode = `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget.js" data-agent-id="${agentIdString || agentId}"></script>`
  const standaloneUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/widget?agent-id=${agentIdString || agentId}`

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode)
    toast.success('Embed code copied to clipboard!')
  }

  const copyStandaloneUrl = () => {
    navigator.clipboard.writeText(standaloneUrl)
    toast.success('Widget URL copied to clipboard!')
  }

  return (
    <div className="space-y-6">
      {/* Main Widget Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="w-5 h-5" />
            <span>Basic Website Widget</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2">
            <Badge variant="default">
              <CheckCircle className="w-3 h-3 mr-1" />
              Available
            </Badge>
          </div>
          
          {/* Widget Information */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Widget ID:</span>
                <span className="text-sm text-gray-900 font-mono">{agentIdString || agentId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Agent Name:</span>
                <span className="text-sm text-gray-900">{agentName}</span>
              </div>
            </div>
          </div>
          
          {/* Important Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">How the Website Widget Works</p>
                <p className="mb-2">
                  This widget lets visitors chat with your AI agent directly on your website. It's simple and works right away.
                </p>
                <p className="font-medium">Important to know:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Conversations are saved only on the visitor's device (local storage)</li>
                  <li>When they close the browser or clear their data, the chat is gone</li>
                  <li>Each visitor has their own separate chat</li>
                  <li>You won't see these conversations in your dashboard</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Description */}
          <p className="text-gray-600 text-sm">
            Perfect for answering visitor questions, providing quick help, or having simple conversations. 
            Think of it like a chat bubble that appears on your website - visitors can ask questions and 
            get instant responses from your AI agent.
          </p>
          
          {/* Embed Code Section */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Website Embed Code</h4>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <code>{embedCode}</code>
              </div>
              <Button
                onClick={copyEmbedCode}
                variant="outline"
                className="mt-2 w-full sm:w-auto"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Embed Code
              </Button>
                             <p className="text-xs text-gray-500 mt-2">
                 Give this code to your web developer or paste it in your website's code
               </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Standalone Widget URL</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Globe className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-blue-800 break-all">{standaloneUrl}</p>
                  </div>
                </div>
              </div>
              <Button
                onClick={copyStandaloneUrl}
                variant="outline"
                className="mt-2 w-full sm:w-auto"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Copy Standalone URL
              </Button>
                             <p className="text-xs text-gray-500 mt-2">
                 Direct link to open the chat widget - you can share this link or embed it
               </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Widget Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>Widget Features</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-green-700">✅ What You Get</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Instant chat responses from your AI agent</li>
                <li>Works on phones, tablets, and computers</li>
                <li>Easy to add to any website</li>
                <li>Ready to use immediately</li>
                <li>Free to use with your agent</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-orange-700">⚠️ Keep in Mind</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Chats stay on visitor's device only</li>
                <li>You won't see these conversations</li>
                <li>Chat disappears when visitor closes browser</li>
                <li>No visitor contact information collected</li>
                <li>Best for quick questions and answers</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>


    </div>
  )
} 