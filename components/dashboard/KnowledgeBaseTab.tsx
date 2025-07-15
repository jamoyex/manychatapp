'use client'

import { useState, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getKnowledgeBase, uploadKnowledgeBaseFiles, deleteKnowledgeBaseFile, trainBot } from '@/lib/auth';
import { FileUp, X, FileText, CheckCircle, AlertTriangle, Clock, Trash2, Brain } from 'lucide-react';
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
}

export interface KnowledgeBaseTabRef {
  uploadFiles: () => void;
  trainBot: () => void;
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

interface KnowledgeFile {
  id: number;
  file_name: string;
  file_size: number;
  file_url?: string;
  status: 'PENDING' | 'TRAINING' | 'COMPLETED' | 'FAILED' | 'UPLOADED';
  trained?: boolean;
  last_updated: string | null;
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
  onAgentStateChange
}, ref) => {
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchKnowledgeBase();
  }, [agentId]);

  // Poll for training status updates when training is in progress
  useEffect(() => {
    if (!agent?.is_training) return;

    const interval = setInterval(async () => {
      try {
        // Fetch fresh agent data to check if training completed
        const res = await fetch(`/api/agents/${agentId}`);
        if (!res.ok) throw new Error('Failed to fetch agent status');
        
        const { agent: freshAgent } = await res.json();
        
        // If training has finished, stop polling and refresh the data
        if (!freshAgent.is_training) {
          clearInterval(interval);
          fetchKnowledgeBase(); // Fetch updated file statuses
          
          // Notify parent that training has completed
          if (onAgentStateChange) {
            onAgentStateChange({ 
              is_training: false, 
              last_trained: freshAgent.last_trained 
            });
          }
        }
      } catch (error) {
        console.error('Failed to poll training status:', error);
        clearInterval(interval); // Stop polling on error
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval); // Cleanup on component unmount
  }, [agent?.is_training, agentId]);

  const fetchKnowledgeBase = async () => {
    try {
      setIsLoading(true);
      const { knowledgeBase } = await getKnowledgeBase(agentId);
      setKnowledgeFiles(knowledgeBase);
    } catch (err) {
      setError('Failed to fetch knowledge base files.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentTotalSize = useMemo(() => {
    return knowledgeFiles.reduce((total, file) => total + file.file_size, 0);
  }, [knowledgeFiles]);

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

  const handleDeleteFile = async (fileId: number) => {
    try {
      await deleteKnowledgeBaseFile(agentId, fileId);
      fetchKnowledgeBase();
    } catch (err) {
      setError('Failed to delete file.');
      console.error(err);
    }
  };

  const handleTrainBot = async () => {
    if (knowledgeFiles.length === 0) {
      setError('No files available for training.');
      return;
    }

    setIsTraining(true);
    setError(null);
    try {
      const result = await trainBot(agentId);
      
      // Notify parent that training has started
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

  const hasUntrainedFiles = useMemo(() => {
    return knowledgeFiles.some(file => !file.trained);
  }, [knowledgeFiles]);

  const trainedFilesCount = useMemo(() => {
    return knowledgeFiles.filter(file => file.trained).length;
  }, [knowledgeFiles]);

  const totalFilesCount = knowledgeFiles.length;

  // Notify parent about button state changes
  useEffect(() => {
    if (onButtonStatesChange) {
      const uploadState = {
        canUpload: newFiles.length > 0 && !isUploading && !agent?.is_training,
        isUploading,
        label: isUploading ? 'Uploading...' : 'Upload Files'
      };
      
      const trainState = {
        canTrain: knowledgeFiles.length > 0 && !isTraining && !agent?.is_training,
        isTraining: isTraining || !!agent?.is_training,
        label: isTraining ? 'Starting...' : 
               agent?.is_training ? 'Training...' : 
               hasUntrainedFiles ? 'Train Bot (Update)' : 'Train Bot'
      };
      

      
      onButtonStatesChange({
        upload: uploadState,
        train: trainState
      });
    }
  }, [newFiles.length, isUploading, agent?.is_training, knowledgeFiles.length, isTraining, hasUntrainedFiles, onButtonStatesChange]);

  // Expose functions to parent component via ref
  useImperativeHandle(ref, () => ({
    uploadFiles: handleUploadFiles,
    trainBot: handleTrainBot,
    getUploadButtonState: () => ({
      canUpload: newFiles.length > 0 && !isUploading && !agent?.is_training,
      isUploading,
      label: isUploading ? 'Uploading...' : 'Upload Files'
    }),
    getTrainButtonState: () => ({
      canTrain: knowledgeFiles.length > 0 && !isTraining && !agent?.is_training,
      isTraining: isTraining || !!agent?.is_training,
      label: isTraining ? 'Starting...' : 
             agent?.is_training ? 'Training...' : 
             hasUntrainedFiles ? 'Train Bot (Update)' : 'Train Bot'
    })
  }), [handleUploadFiles, handleTrainBot, newFiles.length, isUploading, agent?.is_training, knowledgeFiles.length, isTraining, hasUntrainedFiles]);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Train Your AI Agent with Custom Knowledge</h3>
        <p className="text-blue-800 text-sm">
          Upload documents to give your AI agent specialized knowledge about your business, products, or services. 
          Your agent will learn from these documents and use this information when chatting with users.
        </p>
        <div className="mt-3 space-y-2">
          <p className="text-blue-800 text-sm flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Supported formats: PDF, DOCX
          </p>
          <p className="text-blue-800 text-sm flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Each file must be under 5MB, total limit 20MB
          </p>
          <p className="text-blue-800 text-sm flex items-center">
            <Brain className="w-4 h-4 mr-2" />
            Remember to click "Train Bot" after adding new files
          </p>
        </div>
      </div>

      {/* Last Trained Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5" />
            <span>Training Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Last Trained:</span>
              <span className="text-sm font-medium">
                {formatLastTrained(agent?.last_trained)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Files in Training:</span>
              <span className="text-sm font-medium">
                {trainedFilesCount} of {totalFilesCount}
              </span>
            </div>
            {agent?.is_training && (
              <div className="flex items-center space-x-2 text-yellow-600 bg-yellow-50 p-3 rounded-md">
                <Clock className="w-5 h-5 animate-spin"/>
                <p className="text-sm">Training in progress...</p>
              </div>
            )}
            {hasUntrainedFiles && !agent?.is_training && (
              <div className="flex items-center space-x-2 text-blue-600 bg-blue-50 p-3 rounded-md">
                <AlertTriangle className="w-5 h-5"/>
                <p className="text-sm">New files detected. Click "Train Bot" to include them in training.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base</CardTitle>
          <CardDescription>
            Upload PDF or DOCX files to train your agent. The total size of all files cannot exceed 20MB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Storage Used</span>
                <span>
                  {(currentTotalSize / (1024 * 1024)).toFixed(2)}MB / 20MB
                </span>
              </div>
              <Progress value={(currentTotalSize / MAX_TOTAL_SIZE) * 100} />
            </div>
            
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
            
            {error && <p className="text-red-500 text-sm">{error}</p>}

          </div>
        </CardContent>
      </Card>
      
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
                  <span className="text-xs text-gray-400">({(file.size / (1024*1024)).toFixed(2)} MB)</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveNewFile(file)}>
                  <X className="w-4 h-4"/>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Existing Files */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Files</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? <p>Loading...</p> : 
            knowledgeFiles.length === 0 ? <p className="text-sm text-gray-500">No files uploaded yet.</p> :
            knowledgeFiles.map(file => (
              <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-gray-500"/>
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{file.file_name}</span>
                      {file.trained ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Trained
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Not Trained
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">({(file.file_size / (1024*1024)).toFixed(2)} MB)</span>
                    {file.file_url && (
                      <a 
                        href={file.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        View File
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeleteFile(file.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4"/>
                  </Button>
                </div>
              </div>
            ))
          }
        </CardContent>
      </Card>


    </div>
  );
});

KnowledgeBaseTab.displayName = 'KnowledgeBaseTab';