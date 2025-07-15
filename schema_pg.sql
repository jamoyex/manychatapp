-- ManyChat AI Agent SaaS Database Schema

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255), -- Now nullable
    core_credits INTEGER DEFAULT 0, -- New column for credits
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Agents table with comprehensive fields
CREATE TABLE agents (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(255) UNIQUE,
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
    last_trained TIMESTAMP,
    is_training BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    -- Enhanced Responses fields
    enhanced_responses_enabled BOOLEAN DEFAULT false,
    template_installed BOOLEAN DEFAULT false,
    loader_enabled BOOLEAN DEFAULT false,
    gallery_enabled BOOLEAN DEFAULT false,
    quick_replies_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Connected ManyChat Accounts table
CREATE TABLE app_installs (
    id SERIAL PRIMARY KEY,
    page_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id INTEGER UNIQUE REFERENCES agents(id) ON DELETE CASCADE,
    app_token VARCHAR(500) NOT NULL,
    app_version VARCHAR(50) DEFAULT '1.0.0',
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

-- Create indexes for better performance
CREATE INDEX idx_agents_owner_id ON agents(owner_id);
CREATE INDEX idx_app_installs_agent_id ON app_installs(agent_id);
CREATE INDEX idx_app_installs_page_id ON app_installs(page_id);
CREATE INDEX idx_messages_agent_id ON messages(agent_id);
CREATE INDEX idx_messages_page_id ON messages(page_id);
CREATE INDEX idx_messages_manychat_user_id ON messages(manychat_user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
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

-- Knowledge Base table for storing file metadata
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL, -- Stored in bytes
    file_type VARCHAR(255) NOT NULL,
    file_url TEXT, -- Public URL of the file in Cloudflare R2
    trained BOOLEAN DEFAULT false, -- Whether the file has been included in a successful training
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, UPLOADED, FAILED
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP
);

CREATE INDEX idx_knowledge_base_agent_id ON knowledge_base(agent_id);

-- Intent Mappings Table
CREATE TABLE IF NOT EXISTS intent_mappings (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    intent_name VARCHAR(255) NOT NULL,
    manychat_flow_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, intent_name)
);

CREATE INDEX idx_intent_mappings_agent_id ON intent_mappings(agent_id);

-- Update trigger for intent_mappings
CREATE TRIGGER update_intent_mappings_timestamp
    BEFORE UPDATE ON intent_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp(); 