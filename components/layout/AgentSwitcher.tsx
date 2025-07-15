import { useState } from 'react'
import { ChevronDown, Plus, Circle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

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

interface AgentSwitcherProps {
  agents: Agent[]
  selectedAgent: Agent | null
  onAgentChange: (agent: Agent) => void
  onCreateAgent: () => void
}

export function AgentSwitcher({ agents, selectedAgent, onAgentChange, onCreateAgent }: AgentSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center space-x-2 px-3 py-2 h-auto hover:bg-gray-50"
        >
          <span className="text-sm font-medium">
            {selectedAgent ? selectedAgent.bot_name : 'Select Agent'}
          </span>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-64">
        {agents.map((agent) => (
          <DropdownMenuItem
            key={agent.id}
            onClick={() => {
              onAgentChange(agent)
              setIsOpen(false)
            }}
            className="flex items-center space-x-3 p-3 cursor-pointer"
          >
            {/* Status indicator */}
            <Circle 
              className={`h-2 w-2 fill-current ${
                agent.is_installed 
                  ? 'text-green-500' 
                  : 'text-gray-400'
              }`}
            />
            
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {agent.bot_name}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {agent.company_name}
              </div>
            </div>
            
            {selectedAgent?.id === agent.id && (
              <div className="w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => {
            onCreateAgent()
            setIsOpen(false)
          }}
          className="flex items-center space-x-3 p-3 cursor-pointer text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">Create new agent</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 