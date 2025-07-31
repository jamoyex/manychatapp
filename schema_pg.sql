-- BBCore AI Chatbot SaaS Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255), -- Now nullable
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    core_credits INTEGER DEFAULT 0, -- New column for credits
    uuid UUID
);

-- Create UUID generation function for new users
CREATE OR REPLACE FUNCTION generate_uuid_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    NEW.uuid = uuid_generate_v4();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for UUID generation
CREATE TRIGGER trigger_generate_uuid 
    BEFORE INSERT ON users 
    FOR EACH ROW EXECUTE FUNCTION generate_uuid_for_new_user();

-- AI Agents table with comprehensive fields
CREATE TABLE agents (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    bot_name VARCHAR(255) NOT NULL,
    bot_primary_goal TEXT,
    bot_tone_for_replies VARCHAR(255),
    company_location VARCHAR(255),
    company_name VARCHAR(255),
    company_phone_number VARCHAR(50),
    details_about_company TEXT,
    details_about_leader TEXT,
    details_about_product_or_service TEXT,
    facebook_page_url VARCHAR(500),
    industry VARCHAR(255),
    instagram_url VARCHAR(500),
    leader_full_name VARCHAR(255),
    linkedin_url VARCHAR(500),
    product_or_service_you_sell TEXT,
    purchase_book_appointments_here VARCHAR(500),
    support_email_address VARCHAR(255),
    tiktok_url VARCHAR(500),
    twitter_url VARCHAR(500),
    website_url VARCHAR(500),
    youtube_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    agent_id VARCHAR(255) UNIQUE,
    last_trained TIMESTAMP,
    is_training BOOLEAN DEFAULT false,
    -- Enhanced Responses fields
    enhanced_responses_enabled BOOLEAN DEFAULT false,
    template_installed BOOLEAN DEFAULT false,
    loader_enabled BOOLEAN DEFAULT false,
    gallery_enabled BOOLEAN DEFAULT false,
    quick_replies_enabled BOOLEAN DEFAULT false,
    typing_indicator_flow VARCHAR(255),
    bot_image_url TEXT
);

-- Connected ManyChat Accounts table
CREATE TABLE app_installs (
    id SERIAL PRIMARY KEY,
    page_id VARCHAR(255) UNIQUE NOT NULL,
    agent_id INTEGER UNIQUE REFERENCES agents(id) ON DELETE CASCADE,
    app_token VARCHAR(500) NOT NULL,
    app_version VARCHAR(50) DEFAULT '1.0.0',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

-- Go High Level Integrations table
CREATE TABLE ghl_integrations (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER UNIQUE REFERENCES agents(id) ON DELETE CASCADE,
    ghl_location_id VARCHAR(255) NOT NULL,
    ghl_company_id VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP NOT NULL,
    location_name VARCHAR(255),
    company_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
    page_id VARCHAR(255) NOT NULL,
    manychat_user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('user', 'agent', 'ai')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced Knowledge Base table for storing multiple data types
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER, -- Stored in bytes
    file_type VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, UPLOADED, FAILED
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP,
    file_url TEXT, -- Public URL of the file in Cloudflare R2
    trained BOOLEAN DEFAULT false, -- Whether the item has been included in a successful training
    knowledge_base_type VARCHAR(50) DEFAULT 'file' CHECK (knowledge_base_type IN ('file', 'link', 'text', 'qa')),
    title VARCHAR(255),
    link TEXT,
    content TEXT,
    question TEXT,
    answer TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true -- Soft delete flag
);

-- Intent Mappings Table
CREATE TABLE intent_mappings (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    intent_name VARCHAR(255) NOT NULL,
    manychat_flow_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, intent_name)
);

-- Create indexes for better performance
CREATE INDEX idx_agents_owner_id ON agents(owner_id);
CREATE INDEX idx_app_installs_agent_id ON app_installs(agent_id);
CREATE INDEX idx_app_installs_page_id ON app_installs(page_id);
CREATE INDEX idx_messages_agent_id ON messages(agent_id);
CREATE INDEX idx_messages_page_id ON messages(page_id);
CREATE INDEX idx_messages_manychat_user_id ON messages(manychat_user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_knowledge_base_agent_id ON knowledge_base(agent_id);
CREATE INDEX idx_knowledge_base_type ON knowledge_base(knowledge_base_type);
CREATE INDEX idx_knowledge_base_agent_type ON knowledge_base(agent_id, knowledge_base_type);
CREATE INDEX idx_knowledge_base_is_active ON knowledge_base(is_active);
CREATE INDEX idx_intent_mappings_agent_id ON intent_mappings(agent_id);
CREATE INDEX idx_users_uuid ON users(uuid) WHERE uuid IS NOT NULL;
CREATE INDEX idx_ghl_integrations_agent_id ON ghl_integrations(agent_id);
CREATE INDEX idx_ghl_integrations_location_id ON ghl_integrations(ghl_location_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create knowledge base updated_at trigger function
CREATE OR REPLACE FUNCTION update_knowledge_base_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create timestamp function for intent_mappings
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_installs_updated_at BEFORE UPDATE ON app_installs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at 
    BEFORE UPDATE ON knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_knowledge_base_updated_at();

CREATE TRIGGER update_intent_mappings_timestamp
    BEFORE UPDATE ON intent_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_ghl_integrations_updated_at BEFORE UPDATE ON ghl_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments to document the enhanced structure
COMMENT ON TABLE knowledge_base IS 'Enhanced knowledge base table supporting files, links, texts, and Q&A pairs for AI training. knowledge_base_type categorizes the content type.';
COMMENT ON COLUMN knowledge_base.is_active IS 'Soft delete flag. Items marked inactive are hidden from UI but remain in database until bot is retrained.'; 