-- Migration: Add Enhanced Responses fields to agents table
-- Run this script to add the new fields to existing agents table

-- Add new columns for enhanced responses
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS enhanced_responses_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS template_installed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS loader_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gallery_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quick_replies_enabled BOOLEAN DEFAULT false;

-- Update existing records to have default values
UPDATE agents 
SET 
  enhanced_responses_enabled = false,
  template_installed = false,
  loader_enabled = false,
  gallery_enabled = false,
  quick_replies_enabled = false
WHERE enhanced_responses_enabled IS NULL;

-- Verify the migration
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'agents' 
  AND column_name IN (
    'enhanced_responses_enabled',
    'template_installed', 
    'loader_enabled',
    'gallery_enabled',
    'quick_replies_enabled'
  ); 