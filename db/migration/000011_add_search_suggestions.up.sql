-- Create logs table
CREATE TABLE search_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    query TEXT NOT NULL,
    searched_at TIMESTAMPTZ DEFAULT now()
);

-- Create suggestions table
CREATE TABLE search_suggestions (
    query TEXT PRIMARY KEY,
    count INT DEFAULT 1
);

-- Create function
CREATE OR REPLACE FUNCTION update_search_suggestions()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO search_suggestions (query)
    VALUES (NEW.query)
    ON CONFLICT (query) 
    DO UPDATE SET count = search_suggestions.count + 1;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER after_search
AFTER INSERT ON search_logs
FOR EACH ROW EXECUTE FUNCTION update_search_suggestions();
