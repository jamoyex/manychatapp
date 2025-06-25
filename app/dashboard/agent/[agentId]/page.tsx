'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
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

export default function ViewAgentPage({ params }: { params: { agentId: string } }) {
    const agentId = params.agentId as string;

    const [agent, setAgent] = useState<Agent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (agentId) {
            const fetchAgentDetails = async () => {
                setIsLoading(true);
                setError('');
                try {
                    const response = await fetch(`/api/agents/${agentId}`, {
                        credentials: 'include'
                    });
                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || 'Failed to fetch agent details');
                    }
                    setAgent(data.agent);
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'An unknown error occurred');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchAgentDetails();
        }
    }, [agentId]);

    if (isLoading) {
        return <div className="p-8">Loading agent details...</div>
    }

    if (error) {
        return <div className="p-8 text-red-500">Error: {error}</div>
    }

    if (!agent) {
        return <div className="p-8">Agent not found.</div>
    }
    
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
                        <KnowledgeBaseTab agentId={String(params.agentId)} />
                    </TabsContent>
                    <TabsContent value="intent-checker">
                        <IntentCheckerTab agentId={String(params.agentId)} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
} 