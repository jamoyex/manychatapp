import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { IntentCheckerTab } from '@/components/dashboard/IntentCheckerTab'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { KnowledgeBaseTab } from '@/components/dashboard/KnowledgeBaseTab'

// It's good practice to have shared type definitions.
// For now, we define it here.
interface Agent {
  id: number;
  bot_name: string;
  company_name: string;
  company_description: string;
  target_audience_description: string;
  support_contact_name: string;
  support_email_address: string;
  status: string;
  tone_and_style_guide: string;
  specific_instructions: string;
  created_at: string;
  knowledge_base_urls: string[];
}

const DetailItem = ({ label, value }: { label: string; value: string | undefined | null }) => (
    <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="mt-1 text-sm text-gray-900">{value || 'N/A'}</p>
    </div>
);

async function getAgent(agentId: string): Promise<Agent> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents/${agentId}`, {
        cache: 'no-store'
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch agent');
    }
    
    const data = await response.json();
    return data.agent;
}

type PageProps = {
    params: Promise<{ agentId: string }>;
    searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function ViewAgentPage({ params, searchParams }: PageProps) {
    const resolvedParams = await params;
    const agent = await getAgent(resolvedParams.agentId);
    const agentIdNumber = parseInt(resolvedParams.agentId, 10);
    
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Link>

                <Tabs defaultValue="details">
                    <TabsList>
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="knowledge-base">Knowledge Base</TabsTrigger>
                        <TabsTrigger value="intent-checker">Intent Checker</TabsTrigger>
                    </TabsList>
                    <TabsContent value="details">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                   <div>
                                        <CardTitle className="text-2xl font-bold">{agent.bot_name}</CardTitle>
                                        <CardDescription>Details for your AI Agent.</CardDescription>
                                   </div>
                                   <span className={`px-3 py-1 text-xs font-semibold rounded-full ${agent.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {agent.status ? agent.status.charAt(0).toUpperCase() + agent.status.slice(1) : 'Unknown'}
                                   </span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 space-y-6">
                                       <Card>
                                           <CardHeader>
                                               <CardTitle className="text-lg">Company & Audience</CardTitle>
                                           </CardHeader>
                                           <CardContent className="space-y-4">
                                               <DetailItem label="Company Name" value={agent.company_name} />
                                               <DetailItem label="Company Description" value={agent.company_description} />
                                               <DetailItem label="Target Audience" value={agent.target_audience_description} />
                                           </CardContent>
                                       </Card>
                                        <Card>
                                           <CardHeader>
                                               <CardTitle className="text-lg">AI Configuration</CardTitle>
                                           </CardHeader>
                                           <CardContent className="space-y-4">
                                                <DetailItem label="Tone & Style Guide" value={agent.tone_and_style_guide} />
                                                <DetailItem label="Specific Instructions" value={agent.specific_instructions} />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-500">Knowledge Base URLs</p>
                                                    {agent.knowledge_base_urls && agent.knowledge_base_urls.length > 0 ? (
                                                        <ul className="mt-1 list-disc list-inside text-sm text-gray-900">
                                                            {agent.knowledge_base_urls.map((url, index) => <li key={index}><a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{url}</a></li>)}
                                                        </ul>
                                                    ) : (
                                                        <p className="mt-1 text-sm text-gray-900">N/A</p>
                                                    )}
                                                </div>
                                           </CardContent>
                                       </Card>
                                       <Card>
                                           <CardHeader>
                                               <CardTitle className="text-lg">Support & Metadata</CardTitle>
                                           </CardHeader>
                                           <CardContent className="space-y-4">
                                                <DetailItem label="Support Contact" value={agent.support_contact_name} />
                                                <DetailItem label="Support Email" value={agent.support_email_address} />
                                                <DetailItem label="Created On" value={formatDate(agent.created_at)} />
                                           </CardContent>
                                       </Card>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="knowledge-base">
                        <Suspense fallback={<div>Loading knowledge base...</div>}>
                            <KnowledgeBaseTab agentId={agentIdNumber} />
                        </Suspense>
                    </TabsContent>
                    <TabsContent value="intent-checker">
                        <Suspense fallback={<div>Loading intent checker...</div>}>
                            <IntentCheckerTab agentId={agentIdNumber} />
                        </Suspense>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    ); 
} 