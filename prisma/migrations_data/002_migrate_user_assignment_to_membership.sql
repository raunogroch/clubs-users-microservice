-- Migration: Convert UserAssignment to UserMembership
-- Purpose: Create UserMembership entries from UserAssignment
-- Assigns default ATHLETE role since UserAssignment doesn't have role info

INSERT INTO user_memberships (id, user_id, assignment_id, role, status, created_at, updated_at)
SELECT 
  gen_random_uuid()::text,
  ua.user_id,
  ua.assignment_id,
  'ATHLETE'::text,
  ua.status,
  ua.created_at,
  ua.updated_at
FROM user_assignments ua
WHERE NOT EXISTS (
  SELECT 1 FROM user_memberships um
  WHERE um.user_id = ua.user_id
  AND um.assignment_id = ua.assignment_id
  AND um.role = 'ATHLETE'
)
ON CONFLICT (user_id, assignment_id, role) DO NOTHING;
