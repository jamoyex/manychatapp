import { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Copy, Brain, Plus, Save } from 'lucide-react'
import { KnowledgeBaseTab, KnowledgeBaseTabRef } from './KnowledgeBaseTab'
import { IntentCheckerTab } from './IntentCheckerTab'
import { EnhancedResponsesTab } from './EnhancedResponsesTab'
import { toast } from 'sonner'
import { IntegrationsTab } from './IntegrationsTab'
import { BotImageUpload } from './BotImageUpload'

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
  enhanced_responses_enabled?: boolean
  template_installed?: boolean
  loader_enabled?: boolean
  gallery_enabled?: boolean
  quick_replies_enabled?: boolean
  [key: string]: any
}

interface AgentConfigurationInterfaceProps {
  agent: Agent
  onAgentUpdated: (updatedAgent: Agent) => void
  onInstallClick?: () => void
  installLink?: string
  userEmail?: string
}

const TabContentWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="space-y-6 py-6 px-6">
    {children}
  </div>
)

export function AgentConfigurationInterface({ agent, onAgentUpdated, onInstallClick, installLink, userEmail }: AgentConfigurationInterfaceProps) {
  const [formData, setFormData] = useState(agent)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('core')
  const [activeAdvancedTab, setActiveAdvancedTab] = useState('intents')
  const [activeKnowledgeTab, setActiveKnowledgeTab] = useState('files')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showFloatingSave, setShowFloatingSave] = useState(false)
  const knowledgeBaseRef = useRef<KnowledgeBaseTabRef>(null)
  
  // Knowledge Base button states
  const [knowledgeBaseButtonStates, setKnowledgeBaseButtonStates] = useState({
    upload: { canUpload: false, isUploading: false, label: 'Upload Files' },
    train: { canTrain: false, isTraining: false, label: 'Train Bot' }
  })

  useEffect(() => {
    setFormData(agent)
    setHasUnsavedChanges(false)
  }, [agent])

  // Check if regular save buttons should be visible
  const shouldShowRegularSaveButtons = () => {
    if (!hasUnsavedChanges) return false
    if (activeTab === 'advanced' || activeTab === 'knowledge') return false
    return true
  }

  // Update floating save button visibility
  useEffect(() => {
    const shouldShowFloating = hasUnsavedChanges && !shouldShowRegularSaveButtons()
    setShowFloatingSave(shouldShowFloating)
  }, [hasUnsavedChanges, activeTab])

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setHasUnsavedChanges(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      const result = await res.json()
      
      if (!res.ok) {
        throw new Error(result.error || 'Failed to update agent.')
      }
      
      onAgentUpdated(result.agent)
      setHasUnsavedChanges(false)
      toast.success('Agent updated successfully')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Only update parent component when core agent data changes
  const handleAgentDataUpdate = (updatedData: any) => {
    if (activeTab !== 'advanced') {
      onAgentUpdated(updatedData)
    }
  }

  // Handle agent state changes from Knowledge Base (like training status)
  const handleAgentStateChange = (agentUpdate: { is_training: boolean; last_trained?: string }) => {
    const updatedAgent = { 
      ...agent, 
      ...agentUpdate 
    };
    onAgentUpdated(updatedAgent);
  }

  const copyAgentId = async () => {
    try {
      await navigator.clipboard.writeText(agent.agent_id)
      toast.success('Agent ID copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy Agent ID')
    }
  }

  const handleImageUploaded = (imageUrl: string) => {
    const updatedAgent = { ...agent, bot_image_url: imageUrl }
    onAgentUpdated(updatedAgent)
    toast.success('Bot image uploaded successfully')
  }

    return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Agent Overview Section */}
      <div className="mb-8">
                  <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{agent.bot_name}</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-sm text-gray-600">Agent ID: {agent.agent_id}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copyAgentId}
                    className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                    title="Copy Agent ID"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Badge variant={agent.is_installed ? "default" : "secondary"}>
                {agent.is_installed ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Install on ManyChat Button - show when not installed */}
              {!agent.is_installed && installLink && onInstallClick && (
                <Button 
                  onClick={onInstallClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Install on ManyChat
                </Button>
              )}
              
              {/* Save Changes Button - Top */}
              {hasUnsavedChanges && (
                <Button onClick={() => handleSubmit({ preventDefault: () => {} } as FormEvent)} disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </div>
          </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <p className="text-lg font-semibold">
                    {agent.is_installed ? 'Connected' : 'Not Connected'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Industry</p>
                  <p className="text-lg font-semibold">{agent.industry || 'Not set'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Company</p>
                  <p className="text-lg font-semibold">{agent.company_name || 'Not set'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Created</p>
                  <p className="text-lg font-semibold">
                    {new Date(agent.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Agent Configuration Form - EXACT SAME STRUCTURE AS EditAgentModal */}
      <Card>
        <form id="agent-form" onSubmit={handleSubmit}>
          <Tabs defaultValue="core" className="w-full" onValueChange={setActiveTab}>
            <div className="relative w-full border-b">
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                <div className="min-w-max px-2">
                  <TabsList className="h-12 inline-flex items-center gap-4">
                    <TabsTrigger value="core">Core</TabsTrigger>
                    <TabsTrigger value="integrations">Integrations</TabsTrigger>
                    <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  </TabsList>
                </div>
              </div>
            </div>
            
                         <TabsContent value="core">
               <TabContentWrapper>
                 <Accordion type="single" collapsible defaultValue="agent-details" className="w-full">
                   {/* Agent Details Accordion */}
                   <AccordionItem value="agent-details">
                     <AccordionTrigger>Agent Details</AccordionTrigger>
                     <AccordionContent>
                       <div className="space-y-6 pt-4 px-4">
                         <div className="space-y-2">
                           <Label htmlFor="agent_id">Agent ID</Label>
                           <div className="flex items-center space-x-2">
                             <Input 
                               id="agent_id" 
                               name="agent_id" 
                               value={formData.agent_id || ''} 
                               readOnly 
                               disabled 
                               className="font-mono bg-gray-100 flex-1" 
                             />
                             <Button
                               type="button"
                               variant="outline"
                               size="sm"
                               onClick={copyAgentId}
                               className="px-3"
                             >
                               <Copy className="h-4 w-4" />
                             </Button>
                           </div>
                         </div>
                         
                         <div className="space-y-2">
                           <Label htmlFor="bot_name">Bot Name</Label>
                           <Input id="bot_name" name="bot_name" value={formData.bot_name || ''} onChange={handleChange} />
                         </div>
                         
                         <div className="space-y-2">
                           <Label htmlFor="bot_primary_goal">Primary Goal</Label>
                           <Textarea id="bot_primary_goal" name="bot_primary_goal" value={formData.bot_primary_goal || ''} onChange={handleChange} rows={3} />
                         </div>
                         
                         <div className="space-y-2">
                           <Label htmlFor="bot_tone_for_replies">Tone for Replies</Label>
                           <Input id="bot_tone_for_replies" name="bot_tone_for_replies" value={formData.bot_tone_for_replies || ''} onChange={handleChange} />
                         </div>
                         
                         {/* Bot Image Upload */}
                         <BotImageUpload
                           agentId={agent.id}
                           agentName={agent.bot_name}
                           currentImageUrl={agent.bot_image_url}
                           onImageUploaded={handleImageUploaded}
                         />
                       </div>
                     </AccordionContent>
                   </AccordionItem>

                   {/* Company Information Accordion */}
                   <AccordionItem value="company-info">
                     <AccordionTrigger>Company Information</AccordionTrigger>
                     <AccordionContent>
                       <div className="space-y-6 pt-4 px-4">
                         <div className="space-y-2">
                           <Label htmlFor="company_name">Company Name</Label>
                           <Input id="company_name" name="company_name" value={formData.company_name || ''} onChange={handleChange} />
                         </div>
                         
                         <div className="space-y-2">
                           <Label htmlFor="industry">Industry</Label>
                           <Input id="industry" name="industry" value={formData.industry || ''} onChange={handleChange} />
                         </div>
                         
                         <div className="space-y-2">
                           <Label htmlFor="details_about_company">About Company</Label>
                           <Textarea id="details_about_company" name="details_about_company" value={formData.details_about_company || ''} onChange={handleChange} rows={4} />
                         </div>
                         
                         <div className="space-y-2">
                           <Label htmlFor="company_location">Company Location</Label>
                           <Input id="company_location" name="company_location" value={formData.company_location || ''} onChange={handleChange} />
                         </div>
                         
                         <div className="space-y-2">
                           <Label htmlFor="company_phone_number">Company Phone</Label>
                           <Input id="company_phone_number" name="company_phone_number" value={formData.company_phone_number || ''} onChange={handleChange} />
                         </div>
                         
                         <div className="space-y-2">
                           <Label htmlFor="support_email_address">Support Email</Label>
                           <Input id="support_email_address" name="support_email_address" value={formData.support_email_address || ''} onChange={handleChange} />
                         </div>
                       </div>
                     </AccordionContent>
                   </AccordionItem>

                   {/* Leader & Product Information Accordion */}
                   <AccordionItem value="leader-product">
                     <AccordionTrigger>Leader & Product Information</AccordionTrigger>
                     <AccordionContent>
                       <div className="space-y-6 pt-4 px-4">
                         <div className="space-y-2">
                           <Label htmlFor="leader_full_name">Leader's Full Name</Label>
                           <Input id="leader_full_name" name="leader_full_name" value={formData.leader_full_name || ''} onChange={handleChange} />
                         </div>
                         
                         <div className="space-y-2">
                           <Label htmlFor="details_about_leader">About Leader</Label>
                           <Textarea id="details_about_leader" name="details_about_leader" value={formData.details_about_leader || ''} onChange={handleChange} rows={3} />
                         </div>
                         
                         <div className="space-y-2">
                           <Label htmlFor="product_or_service_you_sell">Product/Service</Label>
                           <Input id="product_or_service_you_sell" name="product_or_service_you_sell" value={formData.product_or_service_you_sell || ''} onChange={handleChange} />
                         </div>
                         
                         <div className="space-y-2">
                           <Label htmlFor="details_about_product_or_service">About Product/Service</Label>
                           <Textarea id="details_about_product_or_service" name="details_about_product_or_service" value={formData.details_about_product_or_service || ''} onChange={handleChange} rows={4} />
                         </div>
                       </div>
                     </AccordionContent>
                   </AccordionItem>

                   {/* Social Media & Links Accordion */}
                   <AccordionItem value="social-links">
                     <AccordionTrigger>Social Media & Links</AccordionTrigger>
                     <AccordionContent>
                       <div className="space-y-6 pt-4 px-4">
                         <div className="space-y-2">
                           <Label htmlFor="website_url">Website URL</Label>
                           <Input id="website_url" name="website_url" value={formData.website_url || ''} onChange={handleChange} placeholder="https://example.com" />
                         </div>
                         
                         <div className="space-y-2">
                           <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                           <Input id="linkedin_url" name="linkedin_url" value={formData.linkedin_url || ''} onChange={handleChange} placeholder="https://linkedin.com/company/..." />
                         </div>
                         
                         <div className="space-y-2">
                           <Label htmlFor="twitter_url">Twitter URL</Label>
                           <Input id="twitter_url" name="twitter_url" value={formData.twitter_url || ''} onChange={handleChange} placeholder="https://twitter.com/..." />
                         </div>
                         
                         <div className="space-y-2">
                           <Label htmlFor="facebook_page_url">Facebook Page URL</Label>
                           <Input id="facebook_page_url" name="facebook_page_url" value={formData.facebook_page_url || ''} onChange={handleChange} placeholder="https://facebook.com/..." />
                         </div>
                         
                         <div className="space-y-2">
                           <Label htmlFor="instagram_url">Instagram URL</Label>
                           <Input id="instagram_url" name="instagram_url" value={formData.instagram_url || ''} onChange={handleChange} placeholder="https://instagram.com/..." />
                         </div>
                         
                         <div className="space-y-2">
                           <Label htmlFor="tiktok_url">TikTok URL</Label>
                           <Input id="tiktok_url" name="tiktok_url" value={formData.tiktok_url || ''} onChange={handleChange} placeholder="https://tiktok.com/@..." />
                         </div>
                         
                         <div className="space-y-2">
                           <Label htmlFor="youtube_url">YouTube URL</Label>
                           <Input id="youtube_url" name="youtube_url" value={formData.youtube_url || ''} onChange={handleChange} placeholder="https://youtube.com/..." />
                         </div>
                         
                         <div className="space-y-2">
                           <Label htmlFor="purchase_book_appointments_here">Booking/Purchase URL</Label>
                           <Input id="purchase_book_appointments_here" name="purchase_book_appointments_here" value={formData.purchase_book_appointments_here || ''} onChange={handleChange} placeholder="https://booking.example.com" />
                         </div>
                       </div>
                     </AccordionContent>
                   </AccordionItem>
                 </Accordion>
               </TabContentWrapper>
             </TabsContent>

                                     <TabsContent value="integrations">
              <TabContentWrapper>
                <IntegrationsTab 
                  agentId={agent.id}
                  agentName={agent.bot_name}
                  agentIdString={agent.agent_id}
                  userEmail={userEmail}
                  installLink={installLink}
                  isInstalled={agent.is_installed}
                />
              </TabContentWrapper>
            </TabsContent>

            <TabsContent value="knowledge">
              <TabContentWrapper>
                <KnowledgeBaseTab 
                  ref={knowledgeBaseRef}
                  agentId={agent.id} 
                  agent={{
                    last_trained: formData.last_trained,
                    is_training: formData.is_training
                  }}
                  onButtonStatesChange={setKnowledgeBaseButtonStates}
                  onAgentStateChange={handleAgentStateChange}
                  onTabChange={setActiveKnowledgeTab}
                />
              </TabContentWrapper>
            </TabsContent>

            <TabsContent value="advanced">
              <Tabs value={activeAdvancedTab} onValueChange={setActiveAdvancedTab} className="w-full">
                <div className="mb-4 border-b">
                  <TabsList>
                    <TabsTrigger value="intents">Intent Checker</TabsTrigger>
                    <TabsTrigger value="enhanced">Enhanced Responses</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="intents">
                  <TabContentWrapper>
                    <IntentCheckerTab agentId={agent.id} />
                  </TabContentWrapper>
                </TabsContent>
                <TabsContent value="enhanced">
                  <TabContentWrapper>
                    <EnhancedResponsesTab 
                      agentId={agent.id} 
                      agent={agent}
                      onAgentStateChange={handleAgentStateChange}
                    />
                  </TabContentWrapper>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end p-6 border-t">
            {activeTab !== 'advanced' && activeTab !== 'knowledge' && activeTab !== 'integrations' && (
              <Button type="submit" form="agent-form" disabled={isLoading || !hasUnsavedChanges}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
            
            {/* Knowledge Base buttons - show when in knowledge tab */}
            {activeTab === 'knowledge' && (
              <div className="flex space-x-3">
                {/* Context-aware buttons based on active knowledge tab */}
                {activeKnowledgeTab === 'files' && (
                  <Button 
                    type="button"
                    onClick={() => knowledgeBaseRef.current?.uploadFiles()}
                    disabled={!knowledgeBaseButtonStates.upload.canUpload}
                  >
                    {knowledgeBaseButtonStates.upload.label}
                  </Button>
                )}
                
                {activeKnowledgeTab === 'links' && (
                  <Button 
                    type="button"
                    onClick={() => knowledgeBaseRef.current?.addLink()}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Link</span>
                  </Button>
                )}
                
                {activeKnowledgeTab === 'texts' && (
                  <Button 
                    type="button"
                    onClick={() => knowledgeBaseRef.current?.addText()}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Text</span>
                  </Button>
                )}
                
                {activeKnowledgeTab === 'qa' && (
                  <Button 
                    type="button"
                    onClick={() => knowledgeBaseRef.current?.addQA()}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Q&A</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </form>
      </Card>

      {/* Floating Save Changes Button */}
      {showFloatingSave && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <Button
            onClick={() => handleSubmit({ preventDefault: () => {} } as FormEvent)}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2 px-6 py-3 rounded-full"
            style={{
              animation: 'fadeInUp 0.3s ease-out'
            }}
          >
            <Save className="w-4 h-4" />
            <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      )}

      {/* CSS for fade-in animation */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  )
} 