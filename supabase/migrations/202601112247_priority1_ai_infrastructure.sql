-- Priority 1: Critical AI Infrastructure Tables
-- Migration: 20260111_priority1_ai_infrastructure
-- Description: Adds tables for auto-verification, error recovery, state management, and HITL

-- ============================================
-- 1. Agent Conversation Checkpoints
-- ============================================
CREATE TABLE IF NOT EXISTS agent_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    checkpoint_data JSONB NOT NULL,
    step_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_checkpoints_thread_user 
    ON agent_checkpoints(thread_id, user_id);
CREATE INDEX IF NOT EXISTS idx_agent_checkpoints_created 
    ON agent_checkpoints(created_at DESC);

COMMENT ON TABLE agent_checkpoints IS 'Stores conversation state checkpoints for durable execution';

-- ============================================
-- 2. Agent Logs (Observability)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    thread_id TEXT,
    level TEXT NOT NULL CHECK (level IN ('INFO', 'WARN', 'ERROR')),
    step TEXT NOT NULL,
    data JSONB,
    trace_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_user_created 
    ON agent_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_trace 
    ON agent_logs(trace_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_level 
    ON agent_logs(level, created_at DESC);

COMMENT ON TABLE agent_logs IS 'Structured logs for AI agent operations and debugging';

-- ============================================
-- 3. Verification Results
-- ============================================
CREATE TABLE IF NOT EXISTS verification_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    layer TEXT NOT NULL CHECK (layer IN ('self_check', 'llm_eval', 'cross_agent', 'human')),
    passed BOOLEAN NOT NULL,
    confidence_score DECIMAL(3,2),
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_message 
    ON verification_results(message_id);
CREATE INDEX IF NOT EXISTS idx_verification_user_created 
    ON verification_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_passed 
    ON verification_results(passed, created_at DESC);

COMMENT ON TABLE verification_results IS 'Stores results from multi-layer verification system';

-- ============================================
-- 4. HITL Approval Requests
-- ============================================
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    thread_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_data JSONB NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'timeout')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    response_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_approval_user_status 
    ON approval_requests(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_thread 
    ON approval_requests(thread_id);

COMMENT ON TABLE approval_requests IS 'Human-in-the-loop approval requests for critical operations';

-- ============================================
-- 5. Circuit Breaker State
-- ============================================
CREATE TABLE IF NOT EXISTS circuit_breaker_state (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
    failure_count INTEGER NOT NULL DEFAULT 0,
    last_failure_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE circuit_breaker_state IS 'Tracks circuit breaker state for error recovery';

-- Initialize default circuit breakers
INSERT INTO circuit_breaker_state (id, state, failure_count) 
VALUES 
    ('google_api', 'CLOSED', 0),
    ('openai_api', 'CLOSED', 0),
    ('anthropic_api', 'CLOSED', 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. Row Level Security (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE agent_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuit_breaker_state ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data

-- agent_checkpoints
DROP POLICY IF EXISTS agent_checkpoints_user_policy ON agent_checkpoints;
CREATE POLICY agent_checkpoints_user_policy ON agent_checkpoints
    FOR ALL USING (auth.uid() = user_id);

-- agent_logs
DROP POLICY IF EXISTS agent_logs_user_policy ON agent_logs;
CREATE POLICY agent_logs_user_policy ON agent_logs
    FOR ALL USING (auth.uid() = user_id);

-- verification_results
DROP POLICY IF EXISTS verification_results_user_policy ON verification_results;
CREATE POLICY verification_results_user_policy ON verification_results
    FOR ALL USING (auth.uid() = user_id);

-- approval_requests
DROP POLICY IF EXISTS approval_requests_user_policy ON approval_requests;
CREATE POLICY approval_requests_user_policy ON approval_requests
    FOR ALL USING (auth.uid() = user_id);

-- circuit_breaker_state: Readable by all authenticated users, writable by system
DROP POLICY IF EXISTS circuit_breaker_read_policy ON circuit_breaker_state;
CREATE POLICY circuit_breaker_read_policy ON circuit_breaker_state
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS circuit_breaker_write_policy ON circuit_breaker_state;
CREATE POLICY circuit_breaker_write_policy ON circuit_breaker_state
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 7. Cleanup Functions
-- ============================================

-- Function to clean old checkpoints (keep last 10 per thread)
CREATE OR REPLACE FUNCTION cleanup_old_checkpoints()
RETURNS void AS $$
BEGIN
    DELETE FROM agent_checkpoints
    WHERE id IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (
                PARTITION BY thread_id, user_id 
                ORDER BY created_at DESC
            ) as rn
            FROM agent_checkpoints
        ) sub
        WHERE rn > 10
    );
END;
$$ LANGUAGE plpgsql;

-- Function to clean old logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM agent_logs
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to clean old verification results (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_verification_results()
RETURNS void AS $$
BEGIN
    DELETE FROM verification_results
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. Realtime Subscriptions (for HITL)
-- ============================================

-- Enable realtime for approval_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE approval_requests;

COMMENT ON PUBLICATION supabase_realtime IS 'Enables realtime updates for HITL approval requests';

-- Migration complete
SELECT 'Priority 1 AI Infrastructure tables created successfully' AS status;
