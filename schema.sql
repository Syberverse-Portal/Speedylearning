-- Anonymous visit times only; no visitor identifiers.
CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY AUTOINCREMENT, visited_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_visits_time ON visits (visited_at);
CREATE TABLE IF NOT EXISTS push_subscriptions (id TEXT PRIMARY KEY, subscription_json TEXT NOT NULL, updated_at INTEGER NOT NULL);
