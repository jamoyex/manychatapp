'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Flow {
  ns: string;
  name: string;
}

interface IntentMapping {
  id: number;
  intent_name: string;
  manychat_flow_id: string;
}

export function IntentCheckerTab({ agentId }: { agentId: number }) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [intents, setIntents] = useState<IntentMapping[]>([]);
  const [newIntent, setNewIntent] = useState('');
  const [selectedFlow, setSelectedFlow] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFlowsLoading, setIsFlowsLoading] = useState(true);
  const [flowsError, setFlowsError] = useState<string | null>(null);

  // Fetch ManyChat flows
  useEffect(() => {
    const fetchFlows = async () => {
      setIsFlowsLoading(true);
      setFlowsError(null);
      try {
        const response = await fetch(`/api/agents/${agentId}/manychat-flows`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch flows');
        }
        const data = await response.json();
        if (data.status === 'success' && data.data) {
          setFlows(data.data.flows || []);
        } else {
          throw new Error('Invalid response from ManyChat');
        }
      } catch (error: any) {
        setFlowsError(error.message);
        toast.error(error.message);
      } finally {
        setIsFlowsLoading(false);
      }
    };

    fetchFlows();
  }, [agentId]);

  // Fetch existing intent mappings
  useEffect(() => {
    const fetchIntents = async () => {
      try {
        const response = await fetch(`/api/agents/${agentId}/intents`);
        if (!response.ok) throw new Error('Failed to fetch intents');
        const data = await response.json();
        setIntents(data);
      } catch (error) {
        toast.error('Failed to load intents');
        console.error('Error fetching intents:', error);
      }
    };

    fetchIntents();
  }, [agentId]);

  const handleAddIntent = async () => {
    if (!newIntent || !selectedFlow) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/agents/${agentId}/intents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent_name: newIntent,
          manychat_flow_id: selectedFlow
        })
      });

      if (!response.ok) throw new Error('Failed to add intent');
      
      const newMapping = await response.json();
      setIntents(prev => [...prev, newMapping]);
      setNewIntent('');
      setSelectedFlow('');
      toast.success('Intent mapping added successfully');
    } catch (error) {
      toast.error('Failed to add intent mapping');
      console.error('Error adding intent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteIntent = async (id: number) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/intents/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete intent');
      
      setIntents(prev => prev.filter(intent => intent.id !== id));
      toast.success('Intent mapping deleted successfully');
    } catch (error) {
      toast.error('Failed to delete intent mapping');
      console.error('Error deleting intent:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Advanced Feature: Intent-Based Flow Control</h3>
        <p className="text-blue-800 text-sm">
          This feature allows you to map user intents to specific ManyChat flows. When your AI agent detects a particular intent from the user's message, it can automatically trigger the corresponding flow in ManyChat.
        </p>
        <p className="text-blue-800 text-sm mt-2">
          For example, you could map the intent "book_appointment" to your booking flow, or "pricing_info" to your pricing details flow.
        </p>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Add New Intent Mapping</h3>
        {flowsError ? (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg mb-4">
            <p>{flowsError}</p>
            {flowsError.includes('token') && (
              <p className="text-sm mt-2">
                Please make sure this agent is connected to ManyChat in the Integrations tab.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Intent (e.g., book_appointment)"
              value={newIntent}
              onChange={(e) => setNewIntent(e.target.value)}
              disabled={isFlowsLoading}
            />
            <Select 
              value={selectedFlow} 
              onValueChange={setSelectedFlow}
              disabled={isFlowsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={isFlowsLoading ? "Loading flows..." : "Select ManyChat Flow"} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {isFlowsLoading ? (
                  <div className="p-2 text-center text-muted-foreground">
                    Loading ManyChat flows...
                  </div>
                ) : (
                  flows.map((flow) => (
                    <SelectItem key={flow.ns} value={flow.ns}>
                      {flow.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAddIntent} 
              disabled={isLoading || isFlowsLoading}
            >
              {isLoading ? 'Adding...' : 'Add Intent'}
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Intent Mappings</h3>
        <div className="space-y-4">
          {intents.map((intent) => {
            const flow = flows.find(f => f.ns === intent.manychat_flow_id);
            return (
              <div 
                key={intent.id} 
                className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg"
              >
                <div>
                  <p className="font-medium">{intent.intent_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Flow: {flow?.name || 'Unknown Flow'}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteIntent(intent.id)}
                >
                  Delete
                </Button>
              </div>
            );
          })}
          {intents.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No intent mappings added yet
            </p>
          )}
        </div>
      </Card>
    </div>
  );
} 