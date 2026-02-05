-- Migration: Create project_members table and extend projects table
-- Purpose: Support project collaboration features (Task 8)
-- Date: 2026-01-22

-- ============================================
-- 1. Extend projects table
-- ============================================

-- Add approval workflow configuration
ALTER TABLE projects ADD COLUMN IF NOT EXISTS approval_enabled BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS approval_config JSONB DEFAULT '{"requiresApproval": false, "approvers": []}';

-- Add permission overrides
ALTER TABLE projects ADD COLUMN IF NOT EXISTS permission_overrides JSONB DEFAULT '{}';

-- Add visibility and sharing metadata
ALTER TABLE projects ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS shared_by UUID;

-- Create indexes for extended projects table
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON projects(visibility);
CREATE INDEX IF NOT EXISTS idx_projects_approval_enabled ON projects(approval_enabled);

-- ============================================
-- 2. Create project_members table
-- ============================================

CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  added_by UUID NOT NULL REFERENCES members(id),
  last_accessed_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Composite unique constraint: each member can have only one role per project
  UNIQUE(project_id, member_id)
);

-- Create indexes for project_members table
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_member_id ON project_members(member_id);
CREATE INDEX IF NOT EXISTS idx_project_members_organization_id ON project_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON project_members(role);
CREATE INDEX IF NOT EXISTS idx_project_members_is_active ON project_members(is_active);

-- ============================================
-- 3. Data migration: Add existing project creators as owners
-- ============================================

-- For each existing project, add the creator as an owner in project_members
INSERT INTO project_members (project_id, organization_id, member_id, role, added_by, is_active)
SELECT 
  p.id,
  p.organization_id,
  m.id,
  'owner',
  m.id,
  true
FROM projects p
JOIN members m ON m.user_id = p.user_id AND m.organization_id = p.organization_id
WHERE NOT EXISTS (
  SELECT 1 FROM project_members pm 
  WHERE pm.project_id = p.id AND pm.member_id = m.id
)
ON CONFLICT (project_id, member_id) DO NOTHING;

-- ============================================
-- 4. Update existing projects to private visibility
-- ============================================

UPDATE projects 
SET visibility = 'private' 
WHERE visibility IS NULL OR visibility = '';

-- ============================================
-- 5. Verify data integrity
-- ============================================

-- Check that all projects have at least one owner
-- This query should return 0 rows if all projects have owners
SELECT p.id, p.name
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_members pm 
  WHERE pm.project_id = p.id AND pm.role = 'owner'
);
