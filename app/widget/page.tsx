'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface Message {
  id: string
  content: string
  sender: 'user' | 'bot'
  timestamp: Date
}

export default function WidgetPage() {
  const searchParams = useSearchParams()
  const agentId = searchParams.get('agent-id')
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

  // Load messages from localStorage on component mount
  useEffect(() => {
    if (agentId) {
      const storedMessages = localStorage.getItem(`bb_widget_messages_${agentId}`)
      if (storedMessages) {
        try {
          const parsedMessages = JSON.parse(storedMessages)
          setMessages(parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })))
        } catch (error) {
          console.error('Error loading messages from localStorage:', error)
        }
      } else {
        // Add welcome message if no previous messages
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          content: "Hello! I'm here to help you. How can I assist you today?",
          sender: 'bot',
          timestamp: new Date()
        }
        setMessages([welcomeMessage])
        saveMessagesToStorage([welcomeMessage])
      }
    }
  }, [agentId])

  // Save messages to localStorage
  const saveMessagesToStorage = (newMessages: Message[]) => {
    if (agentId) {
      localStorage.setItem(`bb_widget_messages_${agentId}`, JSON.stringify(newMessages))
    }
  }

  // Get webhook URL from server
  const getWebhookUrl = async () => {
    try {
      const response = await fetch('/api/widget/config')
      if (!response.ok) {
        throw new Error('Failed to get webhook configuration')
      }
      const data = await response.json()
      return data.webhookUrl
    } catch (error) {
      console.error('Error getting webhook URL:', error)
      throw new Error('Webhook configuration error')
    }
  }

  // Send message to webhook
  const sendMessage = async (content: string) => {
    if (!agentId) return

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
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId,
          message: content,
          session_id: getSessionId()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
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
        content: 'Sorry, I encountered an error. Please try again.',
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
    let visitorId = localStorage.getItem('bb_visitor_id')
    if (!visitorId) {
      visitorId = 'visitor_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('bb_visitor_id', visitorId)
    }
    return visitorId
  }

  // Get or create session ID
  const getSessionId = () => {
    let sessionId = localStorage.getItem(`bb_session_id_${agentId}`)
    if (!sessionId) {
      sessionId = 'session_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem(`bb_session_id_${agentId}`, sessionId)
    }
    return sessionId
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const message = inputValue.trim()
    if (message && !isLoading) {
      sendMessage(message)
    }
  }

  // Clear chat history
  const clearChat = () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
      setMessages([])
      if (agentId) {
        localStorage.removeItem(`bb_widget_messages_${agentId}`)
      }
    }
  }

  if (!agentId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-xl font-semibold text-gray-800 mb-4">Invalid Widget URL</h1>
          <p className="text-gray-600">Missing agent ID parameter.</p>
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
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Chat with AI</h1>
              <p className="text-sm text-gray-500">Agent ID: {agentId}</p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border h-[600px] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                  <p className="text-sm">{message.content}</p>
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
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
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