'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

interface Message {
  id: string
  content: string
  sender: 'user' | 'bot'
  timestamp: Date
}

function WidgetChat() {
  const searchParams = useSearchParams()
  const agentId = searchParams.get('agent-id')
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [agentData, setAgentData] = useState<{name: string, imageUrl: string | null} | null>(null)

  // Debug: Log agent ID
  useEffect(() => {
    console.log('Widget Agent ID:', agentId)
  }, [agentId])

  // Get initials from agent name
  const getInitials = (name: string | undefined) => {
    if (!name) return 'AI'
    return name.split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Load messages from localStorage and fetch agent data on component mount
  useEffect(() => {
    if (agentId && !initialized) {
      console.log('Initializing widget for agent:', agentId)
      
      // First, fetch agent data
      getWebhookUrl().then(() => {
        console.log('Agent data loaded')
      }).catch(error => {
        console.error('Error loading agent data:', error)
      })
      
      try {
        const storedMessages = localStorage.getItem(`bb_widget_messages_${agentId}`)
        console.log('Stored messages:', storedMessages)
        
        if (storedMessages) {
          try {
            const parsedMessages = JSON.parse(storedMessages)
            const messagesWithDates = parsedMessages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
            setMessages(messagesWithDates)
            console.log('Loaded messages from storage:', messagesWithDates)
          } catch (parseError) {
            console.error('Error parsing stored messages:', parseError)
            // Clear corrupted data
            localStorage.removeItem(`bb_widget_messages_${agentId}`)
          }
        }
        
        // Add welcome message if no previous messages or if parsing failed
        if (!storedMessages || messages.length === 0) {
          const welcomeMessage: Message = {
            id: Date.now().toString(),
            content: "Hello! I'm here to help you. How can I assist you today?",
            sender: 'bot',
            timestamp: new Date()
          }
          setMessages([welcomeMessage])
          saveMessagesToStorage([welcomeMessage])
          console.log('Added welcome message')
        }
        
        setInitialized(true)
      } catch (error) {
        console.error('Error initializing widget:', error)
        // Fallback: just show welcome message
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          content: "Hello! I'm here to help you. How can I assist you today?",
          sender: 'bot',
          timestamp: new Date()
        }
        setMessages([welcomeMessage])
        setInitialized(true)
      }
    }
  }, [agentId, initialized])

  // Update welcome message when agent data is loaded
  useEffect(() => {
    if (agentData && agentData.name && messages.length > 0) {
      const firstMessage = messages[0]
      // Check if first message is a generic welcome message
      if (firstMessage.sender === 'bot' && 
          firstMessage.content === "Hello! I'm here to help you. How can I assist you today?") {
        const updatedMessage: Message = {
          ...firstMessage,
          content: `Hello! I'm ${agentData.name}. How can I help you today?`
        }
        const updatedMessages = [updatedMessage, ...messages.slice(1)]
        setMessages(updatedMessages)
        saveMessagesToStorage(updatedMessages)
        console.log('Updated welcome message with agent name:', agentData.name)
      }
    }
  }, [agentData, messages])

  // Save messages to localStorage
  const saveMessagesToStorage = (newMessages: Message[]) => {
    if (agentId) {
      try {
        localStorage.setItem(`bb_widget_messages_${agentId}`, JSON.stringify(newMessages))
        console.log('Saved messages to storage:', newMessages.length)
      } catch (error) {
        console.error('Error saving messages to localStorage:', error)
      }
    }
  }

  // Get webhook URL and agent data from server
  const getWebhookUrl = async () => {
    try {
      const response = await fetch(`/api/public/widget/config?agent_id=${agentId}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to get webhook configuration`)
      }
      const data = await response.json()
      console.log('Webhook config:', data)
      
      // Set agent data if available
      if (data.agent) {
        setAgentData(data.agent)
      }
      
      return data.webhookUrl
    } catch (error) {
      console.error('Error getting webhook URL:', error)
      throw new Error('Webhook configuration error')
    }
  }

  // Send message to webhook
  const sendMessage = async (content: string) => {
    if (!agentId) {
      console.error('No agent ID available')
      return
    }

    console.log('Sending message:', content)

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date()
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    saveMessagesToStorage(newMessages)
    setInputValue('')
    setIsTyping(true)

    try {
      // Get webhook URL from server
      const webhookUrl = await getWebhookUrl()
      
      if (!webhookUrl) {
        throw new Error('No webhook URL configured')
      }

      console.log('Sending to webhook:', webhookUrl)
      
      const payload = {
        agent_id: agentId,
        message: content,
        session_id: getSessionId()
      }
      
      console.log('Webhook payload:', payload)

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to get response from webhook`)
      }

      const data = await response.json()
      console.log('Webhook response:', data)
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.output || 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      }

      const updatedMessages = [...newMessages, botMessage]
      setMessages(updatedMessages)
      saveMessagesToStorage(updatedMessages)
    } catch (error) {
      console.error('Error sending message:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error connecting to the server. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      }

      const updatedMessages = [...newMessages, errorMessage]
      setMessages(updatedMessages)
      saveMessagesToStorage(updatedMessages)
    } finally {
      setIsTyping(false)
    }
  }

  // Get or create visitor ID
  const getVisitorId = () => {
    try {
      let visitorId = localStorage.getItem('bb_visitor_id')
      if (!visitorId) {
        visitorId = 'visitor_' + Math.random().toString(36).substr(2, 9)
        localStorage.setItem('bb_visitor_id', visitorId)
      }
      return visitorId
    } catch (error) {
      console.error('Error with visitor ID:', error)
      return 'visitor_' + Math.random().toString(36).substr(2, 9)
    }
  }

  // Get or create session ID
  const getSessionId = () => {
    try {
      let sessionId = localStorage.getItem(`bb_session_id_${agentId}`)
      if (!sessionId) {
        sessionId = 'session_' + Math.random().toString(36).substr(2, 9)
        localStorage.setItem(`bb_session_id_${agentId}`, sessionId)
      }
      return sessionId
    } catch (error) {
      console.error('Error with session ID:', error)
      return 'session_' + Math.random().toString(36).substr(2, 9)
    }
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const message = inputValue.trim()
    if (message && !isLoading && !isTyping) {
      sendMessage(message)
    }
  }

  // Clear chat history
  const clearChat = () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        content: agentData?.name 
          ? `Hello! I'm ${agentData.name}. How can I help you today?`
          : "Hello! I'm here to help you. How can I assist you today?",
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
      saveMessagesToStorage([welcomeMessage])
      
      if (agentId) {
        // Also clear session ID to start fresh
        localStorage.removeItem(`bb_session_id_${agentId}`)
      }
    }
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const messagesContainer = document.getElementById('messages-container')
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight
    }
  }, [messages])

  if (!agentId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-800 mb-2">Invalid Widget URL</h1>
            <p className="text-gray-600 mb-4">Missing agent ID parameter.</p>
            <p className="text-sm text-gray-500">
              Please use a URL like: <br />
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                /widget?agent-id=your_agent_id
              </code>
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!initialized) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600">Initializing chat...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
              {agentData?.imageUrl ? (
                <img 
                  src={agentData.imageUrl} 
                  alt={agentData.name} 
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="text-white font-bold text-sm">
                  {getInitials(agentData?.name)}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {agentData?.name || 'AI Assistant'}
              </h1>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="text-gray-500 hover:text-gray-700 text-sm px-3 py-1 rounded border border-gray-300 hover:border-gray-400 transition-colors"
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border h-[600px] flex flex-col">
          {/* Messages */}
          <div 
            id="messages-container"
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex space-x-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading || isTyping}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading || isTyping}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isTyping ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  'Send'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading chat widget...</p>
        </div>
      </div>
    </div>
  )
}

export default function WidgetPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <WidgetChat />
    </Suspense>
  )
} 