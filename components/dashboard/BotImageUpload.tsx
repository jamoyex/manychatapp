'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface BotImageUploadProps {
  agentId: number
  agentName?: string
  currentImageUrl?: string
  onImageUploaded: (imageUrl: string) => void
}

export function BotImageUpload({ agentId, agentName, currentImageUrl, onImageUploaded }: BotImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.')
      return
    }

    // Validate file size (max 10MB for original upload, will be compressed)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      setError('File size too large. Maximum size is 10MB.')
      return
    }

    setError(null)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('botImage', file)

      const response = await fetch(`/api/agents/${agentId}/upload-bot-image`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image')
      }

      onImageUploaded(data.imageUrl)
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      setError(error.message || 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = async () => {
    // For now, we'll just clear the preview
    // In the future, you might want to add an API endpoint to remove the image from R2
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const displayImage = previewUrl || currentImageUrl

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <ImageIcon className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Bot Profile Image</h3>
          </div>
          
          <p className="text-sm text-gray-600">
            Upload a profile image for your bot. This will be sent to your welcome message.
          </p>

          {/* Compression Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Image Optimization:</strong> Your image will be automatically compressed and resized to 800x800 pixels for optimal performance.
            </p>
          </div>

          {/* Current Image Display */}
          {displayImage && (
            <div className="relative">
              <div 
                className="w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setIsModalOpen(true)}
              >
                <Image
                  src={displayImage}
                  alt="Bot profile"
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              </div>
              {previewUrl && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          )}

          {/* Upload Section */}
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>{displayImage ? 'Change Image' : 'Upload Image'}</span>
              </Button>

              {previewUrl && (
                <Button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex items-center space-x-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Save Image</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {/* File Requirements */}
            <div className="text-xs text-gray-500">
              <p>Supported formats: JPEG, PNG, GIF, WebP</p>
              <p>Maximum file size: 10MB (will be compressed)</p>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Full Screen Image Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] p-4">
          <DialogTitle className="sr-only">Bot Profile Image</DialogTitle>
          <div className="relative w-full h-full flex items-center justify-center">
            <Image
              src={displayImage || ''}
              alt="Bot profile full size"
              width={800}
              height={800}
              className="max-w-full max-h-[70vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
} 