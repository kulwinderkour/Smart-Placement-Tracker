-- Create roadmaps table for permanent storage
CREATE TABLE IF NOT EXISTS roadmaps (
    id SERIAL PRIMARY KEY,
    field VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    roadmap_data JSONB NOT NULL,
    difficulty_level VARCHAR(50) DEFAULT 'intermediate',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    generated_by VARCHAR(100) DEFAULT 'gemini-1.5-flash',
    usage_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_roadmaps_field ON roadmaps(field);
CREATE INDEX IF NOT EXISTS idx_roadmaps_created_at ON roadmaps(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.last_accessed = CURRENT_TIMESTAMP;
    NEW.usage_count = OLD.usage_count + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_roadmap_updated_at 
    BEFORE UPDATE ON roadmaps 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
