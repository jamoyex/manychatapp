'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

interface Agent {
  id: number;
  agent_id: string;
  bot_name: string;
  bot_primary_goal: string;
  bot_tone_for_replies: string;
  company_location: string;
  company_name: string;
  company_phone_number: string;
  details_about_company: string;
  details_about_leader: string;
  details_about_product_or_service: string;
  industry: string;
  leader_full_name: string;
  support_email_address: string;
  is_active: boolean;
  created_at: string;
  // social links etc.
  [key: string]: any;
}

const DetailItem = ({ label, value }: { label: string; value: string | undefined | null }) => (
    <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{value || 'N/A'}</p>
    </div>
);

const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch (error) {
        return 'Invalid Date';
    }
};

export function ViewAgentModal({ agentId, isOpen, onClose }: { agentId: number | null; isOpen: boolean; onClose: () => void; }) {
    const [agent, setAgent] = useState<Agent | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (isOpen && agentId) {
            const fetchAgentDetails = async () => {
                setIsLoading(true);
                setError('');
                setAgent(null);
                try {
                    const response = await fetch(`/api/agents/${agentId}`);
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
    }, [isOpen, agentId]);

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            onClose();
        }
    };

    const handleCopy = () => {
        if (agent?.agent_id) {
            navigator.clipboard.writeText(agent.agent_id);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return <div className="p-8 text-center">Loading agent details...</div>;
        }

        if (error) {
            return <div className="p-8 text-center text-red-500">Error: {error}</div>;
        }

        if (!agent) {
            return <div className="p-8 text-center">No agent details to display.</div>;
        }

        return (
             <div className="mt-4 max-h-[70vh] overflow-y-auto p-1 pr-4">
                <div className="flex justify-between items-start mb-4">
                   <div>
                        <h2 className="text-2xl font-bold">{agent.bot_name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                {agent.agent_id}
                            </span>
                            <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8">
                                {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                   </div>
                   <span className={`px-3 py-1 text-xs font-semibold rounded-full ${agent.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {agent.is_active ? 'Active' : 'Inactive'}
                   </span>
                </div>

                 <div className="space-y-6">
                    <Card>
                       <CardHeader><CardTitle className="text-lg">Company Info</CardTitle></CardHeader>
                       <CardContent className="space-y-4">
                           <DetailItem label="Company Name" value={agent.company_name} />
                           <DetailItem label="Industry" value={agent.industry} />
                           <DetailItem label="Company Description" value={agent.details_about_company} />
                       </CardContent>
                    </Card>
                    <Card>
                       <CardHeader><CardTitle className="text-lg">AI Configuration</CardTitle></CardHeader>
                       <CardContent className="space-y-4">
                            <DetailItem label="Primary Goal" value={agent.bot_primary_goal} />
                            <DetailItem label="Tone for Replies" value={agent.bot_tone_for_replies} />
                       </CardContent>
                    </Card>
                     <Card>
                       <CardHeader><CardTitle className="text-lg">Support & Metadata</CardTitle></CardHeader>
                       <CardContent className="space-y-4">
                            <DetailItem label="Support Email" value={agent.support_email_address} />
                            <DetailItem label="Created On" value={formatDate(agent.created_at)} />
                       </CardContent>
                    </Card>
                 </div>
             </div>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Agent Details</DialogTitle>
                </DialogHeader>
                {renderContent()}
            </DialogContent>
        </Dialog>
    );
} 