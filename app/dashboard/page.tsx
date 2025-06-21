'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getCurrentUser, getAgents, logoutUser, getAgentInstallStatus, getManyChatInstallLink } from '@/lib/auth'
import { CreateAgentModal } from '@/components/dashboard/CreateAgentModal'
import { ViewAgentModal } from '@/components/dashboard/ViewAgentModal'
import { EditAgentModal } from '@/components/dashboard/EditAgentModal'
import { InstallManyChatModal } from '@/components/dashboard/InstallManyChatModal'

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
  isInstalled?: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isCreateModalOpen, setCreateModalOpen] = useState(false)
  const [viewingAgentId, setViewingAgentId] = useState<number | null>(null)
  const [editingAgentId, setEditingAgentId] = useState<number | null>(null)
  const [installLink, setInstallLink] = useState<string>('')
  const [installModalOpen, setInstallModalOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

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
      
      // Check install status for each agent
      const agentsWithInstallStatus = await Promise.all(
        agents.map(async (agent) => {
          try {
            const { isInstalled } = await getAgentInstallStatus(agent.id)
            return { ...agent, isInstalled }
          } catch (error) {
            console.error(`Failed to check install status for agent ${agent.id}:`, error)
            return { ...agent, isInstalled: false }
          }
        })
      )
      
      setAgents(agentsWithInstallStatus)
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
    setAgents(prevAgents => [newAgent, ...prevAgents])
    fetchAgents()
  }

  const handleAgentUpdated = (updatedAgent: Agent) => {
    setAgents(prevAgents => prevAgents.map(agent => agent.id === updatedAgent.id ? updatedAgent : agent))
  }

  const handleInstallClick = (agent: Agent) => {
    setSelectedAgent(agent)
    setInstallModalOpen(true)
  }

  // Active agents are those that exist in app_installs table
  const activeAgentsCount = agents.filter(agent => agent.isInstalled).length

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
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">BB</span>
              </div>
              <h1 className="ml-3 text-xl font-semibold text-gray-900">BBCore Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{agents.length}</div>
              <p className="text-xs text-muted-foreground">
                AI chatbots created
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeAgentsCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Installed on ManyChat
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account Created</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Date(user?.created_at || '').toLocaleDateString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Member since
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Agents Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Your AI Agents</h2>
            <CreateAgentModal
              isOpen={isCreateModalOpen}
              onClose={() => setCreateModalOpen(false)}
              onAgentCreated={handleAgentCreated}
            />
            <Button onClick={() => setCreateModalOpen(true)}>Create AI Agent</Button>
          </div>

          {agents.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 text-2xl">🤖</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No agents yet</h3>
                <p className="text-gray-600 mb-4">
                  Create your first AI chatbot to get started with BBCore.
                </p>
                <Button onClick={() => setCreateModalOpen(true)}>Create Your First Agent</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent) => (
                <Card key={agent.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{agent.bot_name}</CardTitle>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        agent.isInstalled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {agent.isInstalled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <CardDescription>{agent.company_name}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="text-sm text-gray-600">
                      <p><strong>Industry:</strong> {agent.industry}</p>
                      <p><strong>Created:</strong> {new Date(agent.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingAgentId(agent.id)}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => setViewingAgentId(agent.id)}>
                          View
                        </Button>
                      </div>
                      {!agent.isInstalled && installLink && (
                        <Button 
                          size="sm" 
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleInstallClick(agent)}
                        >
                          Install on ManyChat
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <ViewAgentModal
        agentId={viewingAgentId}
        isOpen={viewingAgentId !== null}
        onClose={() => setViewingAgentId(null)}
      />
      <EditAgentModal
        agentId={editingAgentId}
        isOpen={editingAgentId !== null}
        onClose={() => setEditingAgentId(null)}
        onAgentUpdated={handleAgentUpdated}
      />
      <InstallManyChatModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
        installLink={installLink}
        agentName={selectedAgent?.bot_name || ''}
        agentId={selectedAgent?.agent_id}
        userEmail={user?.email}
      />
    </div>
  )
} 