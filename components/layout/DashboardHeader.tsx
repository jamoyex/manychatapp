import { Button } from '@/components/ui/button'
import { AgentSwitcher } from './AgentSwitcher'

interface User {
  id: number
  name: string
  email: string
  core_credits: number
  created_at: string
}

interface Agent {
  id: number
  agent_id: string
  bot_name: string
  company_name: string
  industry: string
  is_active: boolean
  created_at: string
  status: string
  is_installed?: boolean
}

interface DashboardHeaderProps {
  user: User | null
  agents: Agent[]
  selectedAgent: Agent | null
  onAgentChange: (agent: Agent) => void
  onCreateAgent: () => void
  onLogout: () => void
  isLoggingOut: boolean
}

export function DashboardHeader({ 
  user, 
  agents, 
  selectedAgent, 
  onAgentChange, 
  onCreateAgent,
  onLogout, 
  isLoggingOut 
}: DashboardHeaderProps) {
  return (
    <header className="border-b bg-white">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center space-x-4">
          {/* BBCore Logo */}
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">BB</span>
            </div>
            <h1 className="ml-3 text-xl font-semibold text-gray-900">BBCore</h1>
          </div>
          
          {/* User "Team" Dropdown - simplified to just show user name */}
          {user && (
            <div className="flex items-center space-x-4">
            <div className="flex items-center px-3 py-1.5 text-sm text-gray-700 bg-gray-50 rounded-md">
              <span>{user.name}</span>
              </div>
              <div className="flex items-center px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-md">
                <span className="font-medium">{user.core_credits} Core Credits</span>
              </div>
            </div>
          )}
          
          {/* Agent Switcher - only show if agents exist */}
          {agents.length > 0 && (
            <AgentSwitcher
              agents={agents}
              selectedAgent={selectedAgent}
              onAgentChange={onAgentChange}
              onCreateAgent={onCreateAgent}
            />
          )}
        </div>
        
        <div className="ml-auto flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={onLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </div>
    </header>
  )
} 