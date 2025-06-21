'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AgentFormData {
  [key: string]: any;
}

interface EditAgentModalProps {
  agentId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onAgentUpdated: (updatedAgent: any) => void;
}

const TabContentWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="space-y-4 py-4 px-1 max-h-[60vh] overflow-y-auto">
        {children}
    </div>
);


export function EditAgentModal({ agentId, isOpen, onClose, onAgentUpdated }: EditAgentModalProps) {
  const [formData, setFormData] = useState<AgentFormData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && agentId) {
      const fetchAgentData = async () => {
        setIsLoading(true);
        setError('');
        try {
          const res = await fetch(`/api/agents/${agentId}`);
          if (!res.ok) throw new Error('Failed to fetch agent data.');
          const { agent } = await res.json();
          setFormData(agent);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchAgentData();
    }
  }, [isOpen, agentId]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to update agent.');
      onAgentUpdated(result.agent);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit AI Agent</DialogTitle>
          <DialogDescription>
            Make changes to your agent's configuration. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading && !Object.keys(formData).length ? (<p className="py-8 text-center">Loading data...</p>) : (
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="core" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="core">Core</TabsTrigger>
                <TabsTrigger value="company">Company</TabsTrigger>
                <TabsTrigger value="leader_product">Leader & Product</TabsTrigger>
                <TabsTrigger value="links">Links</TabsTrigger>
              </TabsList>
              
              <TabsContent value="core">
                <TabContentWrapper>
                  <div><Label htmlFor="agent_id">Agent ID</Label><Input id="agent_id" name="agent_id" value={formData.agent_id || ''} readOnly disabled className="font-mono bg-gray-100" /></div>
                  <div><Label htmlFor="bot_name">Bot Name</Label><Input id="bot_name" name="bot_name" value={formData.bot_name || ''} onChange={handleChange} /></div>
                  <div><Label htmlFor="bot_primary_goal">Primary Goal</Label><Textarea id="bot_primary_goal" name="bot_primary_goal" value={formData.bot_primary_goal || ''} onChange={handleChange} /></div>
                  <div><Label htmlFor="bot_tone_for_replies">Tone for Replies</Label><Input id="bot_tone_for_replies" name="bot_tone_for_replies" value={formData.bot_tone_for_replies || ''} onChange={handleChange} /></div>
                </TabContentWrapper>
              </TabsContent>

              <TabsContent value="company">
                <TabContentWrapper>
                    <div><Label htmlFor="company_name">Company Name</Label><Input id="company_name" name="company_name" value={formData.company_name || ''} onChange={handleChange} /></div>
                    <div><Label htmlFor="industry">Industry</Label><Input id="industry" name="industry" value={formData.industry || ''} onChange={handleChange} /></div>
                    <div><Label htmlFor="details_about_company">About Company</Label><Textarea id="details_about_company" name="details_about_company" value={formData.details_about_company || ''} onChange={handleChange} /></div>
                    <div><Label htmlFor="company_location">Company Location</Label><Input id="company_location" name="company_location" value={formData.company_location || ''} onChange={handleChange} /></div>
                    <div><Label htmlFor="company_phone_number">Company Phone</Label><Input id="company_phone_number" name="company_phone_number" value={formData.company_phone_number || ''} onChange={handleChange} /></div>
                    <div><Label htmlFor="support_email_address">Support Email</Label><Input id="support_email_address" name="support_email_address" value={formData.support_email_address || ''} onChange={handleChange} /></div>
                </TabContentWrapper>
              </TabsContent>

              <TabsContent value="leader_product">
                  <TabContentWrapper>
                    <div><Label htmlFor="leader_full_name">Leader's Full Name</Label><Input id="leader_full_name" name="leader_full_name" value={formData.leader_full_name || ''} onChange={handleChange} /></div>
                    <div><Label htmlFor="details_about_leader">About Leader</Label><Textarea id="details_about_leader" name="details_about_leader" value={formData.details_about_leader || ''} onChange={handleChange} /></div>
                    <div><Label htmlFor="product_or_service_you_sell">Product/Service</Label><Input id="product_or_service_you_sell" name="product_or_service_you_sell" value={formData.product_or_service_you_sell || ''} onChange={handleChange} /></div>
                    <div><Label htmlFor="details_about_product_or_service">About Product/Service</Label><Textarea id="details_about_product_or_service" name="details_about_product_or_service" value={formData.details_about_product_or_service || ''} onChange={handleChange} /></div>
                  </TabContentWrapper>
              </TabsContent>

              <TabsContent value="links">
                <TabContentWrapper>
                    <div><Label htmlFor="website_url">Website URL</Label><Input id="website_url" name="website_url" value={formData.website_url || ''} onChange={handleChange} /></div>
                    <div><Label htmlFor="linkedin_url">LinkedIn URL</Label><Input id="linkedin_url" name="linkedin_url" value={formData.linkedin_url || ''} onChange={handleChange} /></div>
                    <div><Label htmlFor="twitter_url">Twitter URL</Label><Input id="twitter_url" name="twitter_url" value={formData.twitter_url || ''} onChange={handleChange} /></div>
                    <div><Label htmlFor="facebook_page_url">Facebook Page URL</Label><Input id="facebook_page_url" name="facebook_page_url" value={formData.facebook_page_url || ''} onChange={handleChange} /></div>
                    <div><Label htmlFor="instagram_url">Instagram URL</Label><Input id="instagram_url" name="instagram_url" value={formData.instagram_url || ''} onChange={handleChange} /></div>
                    <div><Label htmlFor="tiktok_url">TikTok URL</Label><Input id="tiktok_url" name="tiktok_url" value={formData.tiktok_url || ''} onChange={handleChange} /></div>
                    <div><Label htmlFor="youtube_url">YouTube URL</Label><Input id="youtube_url" name="youtube_url" value={formData.youtube_url || ''} onChange={handleChange} /></div>
                    <div><Label htmlFor="purchase_book_appointments_here">Booking/Purchase URL</Label><Input id="purchase_book_appointments_here" name="purchase_book_appointments_here" value={formData.purchase_book_appointments_here || ''} onChange={handleChange} /></div>
                </TabContentWrapper>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-4">
                {error && <p className="text-red-500 text-sm mr-auto">{error}</p>}
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
} 