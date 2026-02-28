-- Drop the trigger
DROP TRIGGER IF EXISTS after_search ON search_logs;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_search_suggestions();

-- Drop the suggestions table
DROP TABLE IF EXISTS search_suggestions;

-- Drop the logs table
DROP TABLE IF EXISTS search_logs;
