import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Bot, Plus } from 'lucide-react'

interface EmptyAgentStateProps {
  onCreateAgent: () => void
  userCredits?: number
}

export function EmptyAgentState({ onCreateAgent, userCredits = 0 }: EmptyAgentStateProps) {
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
          
          <p className="text-gray-600 mb-4">
            Create your first AI chatbot to get started. Your agent will be able to chat with users on ManyChat and help with customer support.
          </p>
          
          {userCredits < 1 && (
            <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                ⚠️ You need at least 1 core credit to create an agent. You currently have {userCredits} credits.
              </p>
            </div>
          )}
          
          {userCredits >= 1 && (
            <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                ✅ You have {userCredits} core credits available to create agents.
              </p>
            </div>
          )}
          
          <Button 
            onClick={onCreateAgent} 
            className="w-full"
            disabled={userCredits < 1}
          >
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