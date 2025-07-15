import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Bot, Plus } from 'lucide-react'

interface EmptyAgentStateProps {
  onCreateAgent: () => void
}

export function EmptyAgentState({ onCreateAgent }: EmptyAgentStateProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 p-6">
      <Card className="w-full max-w-md">
        <CardContent className="text-center py-12 px-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Bot className="w-8 h-8 text-blue-600" />
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Welcome to BBCore
          </h2>
          
          <p className="text-gray-600 mb-6">
            Create your first AI chatbot to get started. Your agent will be able to chat with users on ManyChat and help with customer support.
          </p>
          
          <Button onClick={onCreateAgent} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Agent
          </Button>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Your AI agent will learn from the knowledge base you provide and can be customized with specific instructions and intents.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 