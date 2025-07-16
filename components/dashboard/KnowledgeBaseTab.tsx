'use client'

import { useState, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { getKnowledgeBase, uploadKnowledgeBaseFiles, deleteKnowledgeBaseFile, trainBot } from '@/lib/auth';
import { FileUp, X, FileText, CheckCircle, AlertTriangle, Clock, Trash2, Brain, Link, MessageSquare, Plus } from 'lucide-react';
import { useDropzone, FileRejection } from 'react-dropzone';

interface KnowledgeBaseTabProps {
  agentId: number;
  agent?: {
    last_trained?: string;
    is_training?: boolean;
  };
  onButtonStatesChange?: (states: {
    upload: { canUpload: boolean; isUploading: boolean; label: string };
    train: { canTrain: boolean; isTraining: boolean; label: string };
  }) => void;
  onAgentStateChange?: (agentUpdate: { is_training: boolean; last_trained?: string }) => void;
  onTabChange?: (tab: string) => void;
}

export interface KnowledgeBaseTabRef {
  uploadFiles: () => void;
  trainBot: () => void;
  addLink: () => void;
  addText: () => void;
  addQA: () => void;
  getUploadButtonState: () => {
    canUpload: boolean;
    isUploading: boolean;
    label: string;
  };
  getTrainButtonState: () => {
    canTrain: boolean;
    isTraining: boolean;
    label: string;
  };
}

interface KnowledgeItem {
  id: number;
  knowledge_base_type: 'file' | 'link' | 'text' | 'qa';
  title: string;
  content?: string;
  link?: string;
  question?: string;
  answer?: string;
  file_name?: string;
  file_size?: number;
  file_url?: string;
  status: 'PENDING' | 'TRAINING' | 'COMPLETED' | 'FAILED' | 'UPLOADED';
  trained?: boolean;
  last_updated: string | null;
  is_active?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

export const KnowledgeBaseTab = forwardRef<KnowledgeBaseTabRef, KnowledgeBaseTabProps>(({ 
  agentId, 
  agent,
  onButtonStatesChange,
  onAgentStateChange,
  onTabChange
}, ref) => {
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('texts');

  // Notify parent of tab changes
  useEffect(() => {
    if (onTabChange) {
      onTabChange(activeTab);
    }
  }, [activeTab, onTabChange]);

  // Form states for different data types
  const [newLink, setNewLink] = useState('');
  const [newText, setNewText] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  
  // Dialog states
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [showQADialog, setShowQADialog] = useState(false);
  
  // Edit dialog states
  const [showEditLinkDialog, setShowEditLinkDialog] = useState(false);
  const [showEditTextDialog, setShowEditTextDialog] = useState(false);
  const [showEditQADialog, setShowEditQADialog] = useState(false);
  
  // Edit form states
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [editLink, setEditLink] = useState('');
  const [editText, setEditText] = useState('');
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');

  useEffect(() => {
    fetchKnowledgeBase();
  }, [agentId]);

  // Poll for training status updates when training is in progress
  useEffect(() => {
    if (!agent?.is_training) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/agents/${agentId}`);
        if (!res.ok) throw new Error('Failed to fetch agent status');
        
        const { agent: freshAgent } = await res.json();
        
        if (!freshAgent.is_training) {
          clearInterval(interval);
          fetchKnowledgeBase();
          
          if (onAgentStateChange) {
            onAgentStateChange({ 
              is_training: false, 
              last_trained: freshAgent.last_trained 
            });
          }
        }
      } catch (error) {
        console.error('Failed to poll training status:', error);
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [agent?.is_training, agentId]);

  const fetchKnowledgeBase = async () => {
    try {
      setIsLoading(true);
      const { knowledgeBase } = await getKnowledgeBase(agentId);
      setKnowledgeItems(knowledgeBase);
    } catch (err) {
      setError('Failed to fetch knowledge base.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentTotalSize = useMemo(() => {
    return knowledgeItems
      .filter(item => item.knowledge_base_type === 'file')
      .reduce((total, item) => total + (item.file_size || 0), 0);
  }, [knowledgeItems]);

  const totalKnowledgeSize = useMemo(() => {
    return knowledgeItems.reduce((total, item) => {
      return total + (item.file_size || 0);
    }, 0);
  }, [knowledgeItems]);

  const newFilesTotalSize = useMemo(() => {
    return newFiles.reduce((total, file) => total + file.size, 0);
  }, [newFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        setError(`File "${fileRejections[0].file.name}" is not a valid type (PDF/DOCX only).`);
      }
      const validatedFiles = acceptedFiles.filter(file => {
        if (file.size > MAX_FILE_SIZE) {
          setError(`File "${file.name}" exceeds the 5MB size limit.`);
          return false;
        }
        return true;
      });
      setNewFiles(prev => [...prev, ...validatedFiles]);
    },
    accept: ACCEPTED_FILE_TYPES,
  });

  const handleRemoveNewFile = (fileToRemove: File) => {
    setNewFiles(prev => prev.filter(file => file !== fileToRemove));
  };

  const handleUploadFiles = async () => {
    if (newFiles.length === 0) return;
    if (currentTotalSize + newFilesTotalSize > MAX_TOTAL_SIZE) {
      setError('Uploading these files would exceed the 20MB total limit.');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      await uploadKnowledgeBaseFiles(agentId, newFiles);
      setNewFiles([]);
      fetchKnowledgeBase(); 
    } catch (err) {
      setError('Failed to upload files.');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddLink = async () => {
    if (!newLink.trim()) return;
    
    try {
      const response = await fetch(`/api/agents/${agentId}/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledge_base_type: 'link',
          link: newLink.trim()
        })
      });
      
      if (!response.ok) throw new Error('Failed to add link');
      
      setNewLink('');
      setShowLinkDialog(false);
      fetchKnowledgeBase();
    } catch (err) {
      setError('Failed to add link.');
      console.error(err);
    }
  };

  const handleAddText = async () => {
    if (!newText.trim()) return;
    
    try {
      const response = await fetch(`/api/agents/${agentId}/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledge_base_type: 'text',
          content: newText.trim()
        })
      });
      
      if (!response.ok) throw new Error('Failed to add text');
      
      setNewText('');
      setShowTextDialog(false);
      fetchKnowledgeBase();
    } catch (err) {
      setError('Failed to add text.');
      console.error(err);
    }
  };

  const handleAddQA = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    
    try {
      const response = await fetch(`/api/agents/${agentId}/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledge_base_type: 'qa',
          question: newQuestion.trim(),
          answer: newAnswer.trim()
        })
      });
      
      if (!response.ok) throw new Error('Failed to add Q&A');
      
      setNewQuestion('');
      setNewAnswer('');
      setShowQADialog(false);
      fetchKnowledgeBase();
    } catch (err) {
      setError('Failed to add Q&A.');
      console.error(err);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      const response = await deleteKnowledgeBaseFile(agentId, itemId);
      fetchKnowledgeBase();
      // Show success message for soft deletion
      if (response && response.message) {
        // You could add a toast notification here if you have a toast system
        console.log(response.message);
      }
    } catch (err) {
      setError('Failed to delete item.');
      console.error(err);
    }
  };

  // Edit functions
  const handleEditLink = (item: KnowledgeItem) => {
    setEditingItem(item);
    setEditLink(item.link || '');
    setShowEditLinkDialog(true);
  };

  const handleEditText = (item: KnowledgeItem) => {
    setEditingItem(item);
    setEditText(item.content || '');
    setShowEditTextDialog(true);
  };

  const handleEditQA = (item: KnowledgeItem) => {
    setEditingItem(item);
    setEditQuestion(item.question || '');
    setEditAnswer(item.answer || '');
    setShowEditQADialog(true);
  };

  const handleUpdateLink = async () => {
    if (!editingItem || !editLink.trim()) return;
    
    try {
      const response = await fetch(`/api/agents/${agentId}/knowledge-base/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          link: editLink.trim(),
          trained: false // Mark as untrained when edited
        })
      });
      
      if (!response.ok) throw new Error('Failed to update link');
      
      setEditLink('');
      setEditingItem(null);
      setShowEditLinkDialog(false);
      fetchKnowledgeBase();
    } catch (err) {
      setError('Failed to update link.');
      console.error(err);
    }
  };

  const handleUpdateText = async () => {
    if (!editingItem || !editText.trim()) return;
    
    try {
      const response = await fetch(`/api/agents/${agentId}/knowledge-base/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editText.trim(),
          title: `Text: ${editText.trim().substring(0, 50)}${editText.trim().length > 50 ? '...' : ''}`,
          trained: false // Mark as untrained when edited
        })
      });
      
      if (!response.ok) throw new Error('Failed to update text');
      
      setEditText('');
      setEditingItem(null);
      setShowEditTextDialog(false);
      fetchKnowledgeBase();
    } catch (err) {
      setError('Failed to update text.');
      console.error(err);
    }
  };

  const handleUpdateQA = async () => {
    if (!editingItem || !editQuestion.trim() || !editAnswer.trim()) return;
    
    try {
      const response = await fetch(`/api/agents/${agentId}/knowledge-base/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: editQuestion.trim(),
          answer: editAnswer.trim(),
          title: `Q&A: ${editQuestion.trim().substring(0, 50)}${editQuestion.trim().length > 50 ? '...' : ''}`,
          trained: false // Mark as untrained when edited
        })
      });
      
      if (!response.ok) throw new Error('Failed to update Q&A');
      
      setEditQuestion('');
      setEditAnswer('');
      setEditingItem(null);
      setShowEditQADialog(false);
      fetchKnowledgeBase();
    } catch (err) {
      setError('Failed to update Q&A.');
      console.error(err);
    }
  };

  const handleTrainBot = async () => {
    if (knowledgeItems.length === 0) {
      setError('No knowledge base items available for training.');
      return;
    }

    setIsTraining(true);
    setError(null);
    try {
      const result = await trainBot(agentId);
      
      if (onAgentStateChange) {
        onAgentStateChange({ is_training: true });
      }
    } catch (err: any) {
      console.error('Training failed:', err);
      setError(err.message || 'Failed to start training.');
    } finally {
      setIsTraining(false);
    }
  };

  const formatLastTrained = (lastTrained: string | undefined) => {
    if (!lastTrained) return 'Never';
    return new Date(lastTrained).toLocaleString();
  };

  const hasUntrainedItems = useMemo(() => {
    return knowledgeItems.some(item => !item.trained);
  }, [knowledgeItems]);

  const hasInactiveItems = useMemo(() => {
    return knowledgeItems.some(item => item.is_active === false);
  }, [knowledgeItems]);

  const needsRetraining = useMemo(() => {
    return hasUntrainedItems || hasInactiveItems;
  }, [hasUntrainedItems, hasInactiveItems]);

  const trainedItemsCount = useMemo(() => {
    return knowledgeItems.filter(item => item.trained).length;
  }, [knowledgeItems]);

  const totalItemsCount = knowledgeItems.length;

  // Notify parent about button state changes
  useEffect(() => {
    if (onButtonStatesChange) {
      const uploadState = {
        canUpload: newFiles.length > 0 && !isUploading && !agent?.is_training,
        isUploading,
        label: isUploading ? 'Uploading...' : 'Upload Files'
      };
      
      const trainState = {
        canTrain: (knowledgeItems.length > 0 || hasInactiveItems) && !isTraining && !agent?.is_training,
        isTraining: isTraining || !!agent?.is_training,
        label: isTraining ? 'Starting...' : 
               agent?.is_training ? 'Training...' : 
               needsRetraining ? 'Train Bot (Update)' : 'Train Bot'
      };
      
      onButtonStatesChange({
        upload: uploadState,
        train: trainState
      });
    }
  }, [newFiles.length, isUploading, agent?.is_training, knowledgeItems.length, isTraining, needsRetraining, hasInactiveItems, onButtonStatesChange]);

  // Expose functions to parent component via ref
  useImperativeHandle(ref, () => ({
    uploadFiles: handleUploadFiles,
    trainBot: handleTrainBot,
    addLink: () => setShowLinkDialog(true),
    addText: () => setShowTextDialog(true),
    addQA: () => setShowQADialog(true),
    getUploadButtonState: () => ({
      canUpload: newFiles.length > 0 && !isUploading && !agent?.is_training,
      isUploading,
      label: isUploading ? 'Uploading...' : 'Upload Files'
    }),
    getTrainButtonState: () => ({
      canTrain: (knowledgeItems.length > 0 || hasInactiveItems) && !isTraining && !agent?.is_training,
      isTraining: isTraining || !!agent?.is_training,
      label: isTraining ? 'Starting...' : 
             agent?.is_training ? 'Training...' : 
             needsRetraining ? 'Train Bot (Update)' : 'Train Bot'
    })
  }), [handleUploadFiles, handleTrainBot, handleAddLink, handleAddText, handleAddQA, newFiles.length, isUploading, agent?.is_training, knowledgeItems.length, isTraining, needsRetraining, hasInactiveItems]);

  const getItemsByType = (type: string) => {
    return knowledgeItems.filter(item => item.knowledge_base_type === type && item.is_active !== false);
  };

  const renderItemActions = (item: KnowledgeItem) => (
    <div className="flex items-center gap-1">
      {item.knowledge_base_type === 'link' && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => handleEditLink(item)}
          className="text-blue-500 hover:text-blue-700"
          title="Edit link"
        >
          <FileText className="w-4 h-4"/>
        </Button>
      )}
      {item.knowledge_base_type === 'text' && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => handleEditText(item)}
          className="text-blue-500 hover:text-blue-700"
          title="Edit text"
        >
          <FileText className="w-4 h-4"/>
        </Button>
      )}
      {item.knowledge_base_type === 'qa' && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => handleEditQA(item)}
          className="text-blue-500 hover:text-blue-700"
          title="Edit Q&A"
        >
          <FileText className="w-4 h-4"/>
        </Button>
      )}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => handleDeleteItem(item.id)}
        className="text-red-500 hover:text-red-700"
        title="Delete"
      >
        <Trash2 className="w-4 h-4"/>
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Knowledge Base Overview Infographic */}
      <div className="mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-blue-900 mb-2">Knowledge Base Overview</h2>
              <div className="flex flex-wrap gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">{getItemsByType('file').length}</span>
                  <span className="text-sm text-blue-700">Files</span>
                </div>
                <div className="flex items-center gap-2">
                  <Link className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">{getItemsByType('link').length}</span>
                  <span className="text-sm text-blue-700">Links</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">{getItemsByType('text').length}</span>
                  <span className="text-sm text-blue-700">Texts</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">{getItemsByType('qa').length}</span>
                  <span className="text-sm text-blue-700">Q&A</span>
                </div>
              </div>
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-blue-900 font-medium">Bot last trained:</span>
                  <span className="text-sm text-blue-700">{formatLastTrained(agent?.last_trained)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-blue-900 font-medium">Storage Used:</span>
                  <span className="text-sm text-blue-700">{(totalKnowledgeSize / (1024 * 1024)).toFixed(2)} MB / 20 MB</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-blue-900 font-medium">Supported:</span>
                  <span className="text-sm text-blue-700">PDF, DOCX, Links, Text, Q&A</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
              <div className="bg-blue-100 border border-blue-200 rounded-md p-3 w-fit">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">How to use Knowledge Base:</h3>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• <strong>Files:</strong> Upload PDF/DOCX documents (max 5MB each)</li>
                  <li>• <strong>Links:</strong> Add website URLs to extract content</li>
                  <li>• <strong>Text:</strong> Add custom text content directly</li>
                  <li>• <strong>Q&A:</strong> Add question-answer pairs for specific responses</li>
                  <li>• <strong>Train Bot:</strong> Click the button to update your AI with new knowledge</li>
                </ul>
              </div>
              <div className="flex flex-col items-center gap-3">
                <Button 
                  onClick={handleTrainBot}
                  disabled={(!knowledgeItems.length && !hasInactiveItems) || isTraining || !!agent?.is_training}
                  className="bg-blue-500 hover:bg-blue-600 text-white w-full lg:w-auto"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  {isTraining ? 'Starting...' : 
                   agent?.is_training ? 'Training...' : 
                   hasUntrainedItems ? 'Train Bot (Update)' : 'Train Bot'}
                </Button>
                              {needsRetraining && (
                <div className="bg-yellow-100 border border-yellow-300 rounded-md p-2 w-48">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-yellow-800 font-medium leading-tight">
                      {hasInactiveItems && hasUntrainedItems 
                        ? 'Retraining required: New items to train and deleted items to remove'
                        : hasInactiveItems 
                        ? 'Retraining required: Deleted items to permanently remove'
                        : 'Retraining required for changes to apply'
                      }
                    </div>
                  </div>
                </div>
              )}
              {!needsRetraining && knowledgeItems.length > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-700 text-center">All items trained</span>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="texts">Text</TabsTrigger>
          <TabsTrigger value="qa">Q&A</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-4">

          {/* File Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center space-y-2 text-gray-500">
              <FileUp className="w-10 h-10"/>
              <p>Drag & drop PDF/DOCX files here, or click to select</p>
              <p className="text-xs">Max file size: 5MB</p>
            </div>
          </div>

          {/* New Files to Upload */}
          {newFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>New Files</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {newFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-500"/>
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(2)} KB)</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveNewFile(file)}>
                      <X className="w-4 h-4"/>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Files Table */}
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Files</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading...</p>
              ) : getItemsByType('file').length === 0 ? (
                <p className="text-sm text-gray-500">No files uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {getItemsByType('file').map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-gray-500"/>
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{item.file_name}</span>
                            {item.trained ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Trained
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Not Trained
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {(item.file_size! / 1024).toFixed(2)} KB • 
                            Last updated: {item.last_updated ? new Date(item.last_updated).toLocaleString() : 'Never'}
                          </span>
                        </div>
                      </div>
                      {renderItemActions(item)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Links Tab */}
        <TabsContent value="links" className="space-y-4">

          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <p>Loading...</p>
              ) : getItemsByType('link').length === 0 ? (
                <p className="text-sm text-gray-500">No links added yet.</p>
              ) : (
                <div className="space-y-2">
                                     {getItemsByType('link').map(item => (
                     <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                       <div className="flex items-center space-x-3">
                         <Link className="w-5 h-5 text-gray-500"/>
                         <div className="flex flex-col">
                           <div className="flex items-center space-x-2">
                             <a 
                               href={item.link} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="text-sm font-medium text-blue-600 hover:text-blue-800"
                             >
                               {item.link}
                             </a>
                             {item.trained ? (
                               <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                 Trained
                               </span>
                             ) : (
                               <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                 Not Trained
                               </span>
                             )}
                           </div>
                           <span className="text-xs text-gray-400">
                             {(item.file_size! / 1024).toFixed(2)} KB • 
                             Last updated: {item.last_updated ? new Date(item.last_updated).toLocaleString() : 'Never'}
                           </span>
                         </div>
                       </div>
                       {renderItemActions(item)}
                     </div>
                   ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Text Tab */}
        <TabsContent value="texts" className="space-y-4">

          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <p>Loading...</p>
              ) : getItemsByType('text').length === 0 ? (
                <p className="text-sm text-gray-500">No text content added yet.</p>
              ) : (
                <div className="space-y-2">
                                     {getItemsByType('text').map(item => (
                     <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                       <div className="flex items-center space-x-3 flex-1">
                         <MessageSquare className="w-5 h-5 text-gray-500 flex-shrink-0"/>
                         <div className="flex flex-col flex-1">
                           <div className="flex items-center space-x-2">
                             <p className="text-sm font-medium">{item.title}</p>
                             {item.trained ? (
                               <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                 Trained
                               </span>
                             ) : (
                               <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                 Not Trained
                               </span>
                             )}
                           </div>
                           <p className="text-xs text-gray-600 line-clamp-2">{item.content}</p>
                           <span className="text-xs text-gray-400">
                             {(item.file_size! / 1024).toFixed(2)} KB • 
                             Last updated: {item.last_updated ? new Date(item.last_updated).toLocaleString() : 'Never'}
                           </span>
                         </div>
                       </div>
                       {renderItemActions(item)}
                     </div>
                   ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Q&A Tab */}
        <TabsContent value="qa" className="space-y-4">

          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <p>Loading...</p>
              ) : getItemsByType('qa').length === 0 ? (
                <p className="text-sm text-gray-500">No Q&A pairs added yet.</p>
              ) : (
                <div className="space-y-2">
                                     {getItemsByType('qa').map(item => (
                     <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                       <div className="flex items-center space-x-3 flex-1">
                         <MessageSquare className="w-5 h-5 text-gray-500 flex-shrink-0"/>
                         <div className="flex flex-col flex-1">
                           <div className="flex items-center space-x-2">
                             <p className="text-sm font-medium">Q: {item.question}</p>
                             {item.trained ? (
                               <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                 Trained
                               </span>
                             ) : (
                               <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                 Not Trained
                               </span>
                             )}
                           </div>
                           <p className="text-xs text-gray-600">A: {item.answer}</p>
                           <span className="text-xs text-gray-400">
                             {(item.file_size! / 1024).toFixed(2)} KB • 
                             Last updated: {item.last_updated ? new Date(item.last_updated).toLocaleString() : 'Never'}
                           </span>
                         </div>
                       </div>
                       {renderItemActions(item)}
                     </div>
                   ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Add Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
            <DialogDescription>
              Add a link to your knowledge base for AI training.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div>
              <Label htmlFor="link-url" className="text-sm font-medium">URL</Label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://example.com"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddLink} disabled={!newLink.trim()}>
                Add Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Text Dialog */}
      <Dialog open={showTextDialog} onOpenChange={setShowTextDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Text Content</DialogTitle>
            <DialogDescription>
              Add text content to your knowledge base for AI training.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div>
              <Label htmlFor="text-content" className="text-sm font-medium">Content</Label>
              <Textarea
                id="text-content"
                placeholder="Enter your text content here..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                rows={6}
                className="mt-2"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowTextDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddText} disabled={!newText.trim()}>
                Add Text
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Q&A Dialog */}
      <Dialog open={showQADialog} onOpenChange={setShowQADialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Q&A Pair</DialogTitle>
            <DialogDescription>
              Add a question and answer pair to your knowledge base for AI training.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div>
              <Label htmlFor="question" className="text-sm font-medium">Question</Label>
              <Input
                id="question"
                placeholder="Enter your question..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="answer" className="text-sm font-medium">Answer</Label>
              <Textarea
                id="answer"
                placeholder="Enter your answer..."
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowQADialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddQA} disabled={!newQuestion.trim() || !newAnswer.trim()}>
                Add Q&A
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Link Dialog */}
      <Dialog open={showEditLinkDialog} onOpenChange={setShowEditLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Link</DialogTitle>
            <DialogDescription>
              Update the link in your knowledge base.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div>
              <Label htmlFor="edit-link-url" className="text-sm font-medium">URL</Label>
              <Input
                id="edit-link-url"
                type="url"
                placeholder="https://example.com"
                value={editLink}
                onChange={(e) => setEditLink(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditLinkDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateLink} disabled={!editLink.trim()}>
                Update Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Text Dialog */}
      <Dialog open={showEditTextDialog} onOpenChange={setShowEditTextDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Text Content</DialogTitle>
            <DialogDescription>
              Update the text content in your knowledge base.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div>
              <Label htmlFor="edit-text-content" className="text-sm font-medium">Content</Label>
              <Textarea
                id="edit-text-content"
                placeholder="Enter your text content here..."
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={6}
                className="mt-2"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditTextDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateText} disabled={!editText.trim()}>
                Update Text
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Q&A Dialog */}
      <Dialog open={showEditQADialog} onOpenChange={setShowEditQADialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Q&A Pair</DialogTitle>
            <DialogDescription>
              Update the question and answer pair in your knowledge base.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div>
              <Label htmlFor="edit-question" className="text-sm font-medium">Question</Label>
              <Input
                id="edit-question"
                placeholder="Enter your question..."
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="edit-answer" className="text-sm font-medium">Answer</Label>
              <Textarea
                id="edit-answer"
                placeholder="Enter your answer..."
                value={editAnswer}
                onChange={(e) => setEditAnswer(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditQADialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateQA} disabled={!editQuestion.trim() || !editAnswer.trim()}>
                Update Q&A
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

KnowledgeBaseTab.displayName = 'KnowledgeBaseTab';