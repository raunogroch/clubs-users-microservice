-- Migration: Convert UserRole to UserMembership
-- Purpose: Populate UserMembership from existing UserRole data
-- Run: pnpm prisma db execute --stdin < migrate_user_role_to_membership.sql

-- For each user, create a UserMembership entry from their first role in UserRole
-- This is a data migration that preserves existing role assignments

INSERT INTO user_memberships (id, user_id, assignment_id, role, status, created_at, updated_at)
SELECT 
  gen_random_uuid()::text,
  ur.user_id,
  ua.assignment_id,
  ur.role,
  'ACTIVE',
  now(),
  now()
FROM user_roles ur
LEFT JOIN user_assignments ua ON ur.user_id = ua.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM user_memberships um
  WHERE um.user_id = ur.user_id
  AND um.role = ur.role
  AND (um.assignment_id = ua.assignment_id OR (um.assignment_id IS NULL AND ua.assignment_id IS NULL))
)
ON CONFLICT (user_id, assignment_id, role) DO NOTHING;
