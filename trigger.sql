CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_intent_mappings_timestamp
    BEFORE UPDATE ON intent_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp(); 