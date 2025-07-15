'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getAgents, logoutUser, getManyChatInstallLink } from '@/lib/auth'
import { CreateAgentModal } from '@/components/dashboard/CreateAgentModal'
import { InstallManyChatModal } from '@/components/dashboard/InstallManyChatModal'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { EmptyAgentState } from '@/components/dashboard/EmptyAgentState'
import { AgentConfigurationInterface } from '@/components/dashboard/AgentConfigurationInterface'

interface User {
  id: number
  name: string
  email: string
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

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isCreateModalOpen, setCreateModalOpen] = useState(false)
  const [installLink, setInstallLink] = useState<string>('')
  const [installModalOpen, setInstallModalOpen] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { user } = await getCurrentUser()
      setUser(user)
      
      // Fetch user's agents and install link
      await Promise.all([
        fetchAgents(),
        fetchInstallLink()
      ])
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAgents = async () => {
    try {
      const { agents } = await getAgents()
      setAgents(agents)
      
      // Auto-select first agent if none selected
      if (agents.length > 0 && !selectedAgent) {
        setSelectedAgent(agents[0])
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    }
  }

  const fetchInstallLink = async () => {
    try {
      const { installLink } = await getManyChatInstallLink()
      setInstallLink(installLink)
    } catch (error) {
      console.error('Failed to fetch install link:', error)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logoutUser()
      router.push('/')
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleAgentCreated = (newAgent: Agent) => {
    setAgents(prev => [...prev, newAgent])
    setSelectedAgent(newAgent)
    setCreateModalOpen(false)
  }

  const handleAgentUpdated = (updatedAgent: Agent) => {
    setAgents(prevAgents => prevAgents.map(agent => agent.id === updatedAgent.id ? updatedAgent : agent))
    setSelectedAgent(updatedAgent)
    // Refresh agents to get updated install status
    fetchAgents()
  }

  const handleAgentChange = (agent: Agent) => {
    setSelectedAgent(agent)
  }

  const handleCreateAgent = () => {
    setCreateModalOpen(true)
  }

  const handleInstallClick = () => {
    setInstallModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        user={user}
        agents={agents}
        selectedAgent={selectedAgent}
        onAgentChange={handleAgentChange}
        onCreateAgent={handleCreateAgent}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />
      
      {agents.length === 0 ? (
        <EmptyAgentState onCreateAgent={handleCreateAgent} />
      ) : selectedAgent ? (
        <AgentConfigurationInterface 
          agent={selectedAgent} 
          onAgentUpdated={handleAgentUpdated}
          onInstallClick={handleInstallClick}
          installLink={installLink}
        />
      ) : (
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <p className="text-gray-500">Select an agent to get started</p>
        </div>
      )}

      {/* Create Agent Modal */}
      <CreateAgentModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onAgentCreated={handleAgentCreated}
      />
      
      {/* Install ManyChat Modal */}
      {selectedAgent && (
        <InstallManyChatModal
          isOpen={installModalOpen}
          onClose={() => setInstallModalOpen(false)}
          installLink={installLink}
          agentName={selectedAgent.bot_name}
          agentId={selectedAgent.agent_id}
          userEmail={user?.email}
        />
      )}
    </div>
  )
} 