import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'blueprint_saas',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

// 测试数据库连接
export async function initDatabase() {
  try {
    const client = await pool.connect();
    console.log('✅ 数据库连接成功');
    
    // 测试查询
    const result = await client.query('SELECT NOW()');
    console.log('✅ 数据库查询测试成功:', result.rows[0].now);
    
    client.release();
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    throw error;
  }
}
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS entities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        attributes JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        task_type VARCHAR(50),
        messages JSONB DEFAULT '[]',
        files JSONB DEFAULT '[]',
        result JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(255),
        details JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        resource_id VARCHAR(255),
        role VARCHAR(50) DEFAULT 'member',
        permissions TEXT[] DEFAULT '{}',
        granted_by UUID REFERENCES users(id),
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, resource_id)
      );

      CREATE TABLE IF NOT EXISTS ontology_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id VARCHAR(255) NOT NULL,
        target_id VARCHAR(255) NOT NULL,
        link_type VARCHAR(50) NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(source_id, target_id, link_type)
      );

      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        identifier VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        plan VARCHAR(50) DEFAULT 'free',
        settings JSONB DEFAULT '{}',
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        parent_id UUID REFERENCES departments(id) ON DELETE CASCADE,
        path TEXT NOT NULL,
        level INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'viewer',
        department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'active',
        invited_by UUID REFERENCES users(id),
        invited_at TIMESTAMP,
        joined_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(organization_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
      CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
      CREATE INDEX IF NOT EXISTS idx_projects_org_archived ON projects(organization_id, is_archived);
      CREATE INDEX IF NOT EXISTS idx_projects_org_created ON projects(organization_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_modules_project_id ON modules(project_id);
      CREATE INDEX IF NOT EXISTS idx_modules_sort_order ON modules(project_id, sort_order);
      CREATE INDEX IF NOT EXISTS idx_entities_project_id ON entities(project_id);
      CREATE INDEX IF NOT EXISTS idx_entities_module_id ON entities(module_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_permissions_resource_id ON user_permissions(resource_id);
      CREATE INDEX IF NOT EXISTS idx_ontology_links_source_id ON ontology_links(source_id);
      CREATE INDEX IF NOT EXISTS idx_ontology_links_target_id ON ontology_links(target_id);
      CREATE INDEX IF NOT EXISTS idx_ontology_links_link_type ON ontology_links(link_type);
      CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
      CREATE INDEX IF NOT EXISTS idx_organizations_identifier ON organizations(identifier);
      CREATE INDEX IF NOT EXISTS idx_departments_organization_id ON departments(organization_id);
      CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON departments(parent_id);
      CREATE INDEX IF NOT EXISTS idx_departments_path ON departments(path);
      CREATE INDEX IF NOT EXISTS idx_members_organization_id ON members(organization_id);
      CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
      CREATE INDEX IF NOT EXISTS idx_members_department_id ON members(department_id);
      CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
      CREATE INDEX IF NOT EXISTS idx_members_org_status ON members(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_departments_org_parent ON departments(organization_id, parent_id);
    `);
    console.log('✅ 数据库表初始化成功');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  } finally {
    client.release();
  }
}
