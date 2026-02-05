
export type RelationType = 'Realtime' | 'Snapshot' | 'Async' | 'InitialEditable';
export type Cardinality = '1:1' | '1:N' | 'N:1' | 'N:M';
export type AttributeCategory = '基础属性' | '关联属性' | '状态属性' | '派生属性' | '系统属性' | '配置属性';

export interface AttributeRelation {
  id: string;
  relationType: RelationType;
  cardinality: Cardinality;
  relatedEntityId: string;
  relatedAttributeId: string;
  functionalPointId?: string;
}

export interface Attribute {
  id: string;
  name: string;
  description: string;
  type: string; 
  category: AttributeCategory;
  required: boolean;
  isUnique: boolean;
  possibleValues?: string;
  isRelation: boolean;
  relations: AttributeRelation[]; 
}

export interface Entity {
  id: string;
  name: string;
  description: string;
  attributes: Attribute[];
  moduleId?: string; // 新增：关联的功能模块ID
}

export interface EntityUsage {
  entityId: string;
  usageType: 'create' | 'link';
}

export interface AttributeInvolvement {
  entityId: string;
  attributeId: string;
}

export interface FunctionalPoint {
  id: string;
  name: string;
  description: string;
  references?: string[];
  entityUsages: EntityUsage[]; 
  involvedAttributes: AttributeInvolvement[]; 
  images?: string[]; // 新增：功能截图（Base64 数组）
}

export interface Module {
  id: string;
  name: string;
  description: string;
  functionalPoints: FunctionalPoint[];
  children?: Module[];
  sortOrder?: number;
}

export interface SystemModel {
  name: string;
  modules: Module[];
  entities: Entity[];
}

export type ViewMode = 'projects' | 'modules' | 'entities' | 'graph' | 'function-graph' | 'gap-analysis' | 'tasks' | 'settings' | 'members' | 'departments';

export type AIModelType = 
  | 'gemini-3-pro-preview' | 'gemini-3-flash-preview' | 'gemini-flash-lite-latest'
  | 'gpt-4o' | 'gpt-4-turbo'
  | 'grok-2' | 'grok-beta'
  | 'deepseek-chat' | 'deepseek-coder'
  | 'doubao-pro' | 'qwen-max';

export interface AIModelProfile {
  id: AIModelType;
  label: string;
  provider: string;
  color: string;
}

export interface ProviderKeys {
  google?: string;
  openai?: string;
  grok?: string;
  deepseek?: string;
  doubao?: string;
  doubaoEndpoint?: string; 
  aliyun?: string;
}

export type GapType = 'consistent' | 'conflict' | 'missing' | 'redundant';

export interface GapItem {
  id: string;
  module: string;
  attributeName: string;
  attributeMeaning: string;
  sourceType: string;
  targetAttributeName: string;
  targetType: string;
  type: GapType;
  rule: string;
  remark: string;
}

export interface EnumMapping {
  id: string;
  attrName: string;
  sourceVal: string;
  sourceMeaning: string;
  targetVal: string;
  targetMeaning: string;
  logic: string;
}

export interface EntityComparison {
  id: string;
  sourceEntityName: string;
  targetEntityName: string;
  relationshipType: '匹配' | '一对多' | '多对一' | '缺失' | '新增';
  migrationNote: string;
  status: 'matched' | 'missing_in_target' | 'extra_in_source' | 'conflict';
  attributeGaps: GapItem[];
  description: string;
}

export interface GapReport {
  id: string;
  sourceProjectId: string;
  sourceProjectName: string;
  targetProjectId: string;
  targetProjectName: string;
  entityComparisons: EntityComparison[];
  enumComparisons: EnumMapping[]; // 枚举对照表
  summary: {
    consistentEntities: number;
    conflictEntities: number;
    missingEntities: number;
    extraEntities: number;
    totalAttributeConflicts: number;
  };
  createdAt: number;
}

export type TaskStatus = 'Analyzing' | 'Synchronizing' | 'Suspended' | 'Completed' | 'Failed';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  files?: { name: string; type: string; data: string }[];
}

export interface AnalysisTask {
  id: string;
  name: string;
  status: TaskStatus;
  taskType?: 'Chat' | 'VisionImport'; // 新增：任务类型
  messages: ChatMessage[];
  createdAt: number;
  isApplied?: boolean;
  previousModelSnapshot?: SystemModel;
  error?: string;
  result?: SystemModel;
  files: { name: string; type: string; data: string }[];
  startTime?: number;
  endTime?: number;
  progress?: number;
}

export interface GapAnalysisTask {
  id: string;
  sourceProjectId: string;
  targetProjectId: string;
  status: TaskStatus;
  report?: GapReport;
  error?: string;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  isArchived: boolean;
  model: SystemModel;
  tasks: AnalysisTask[];
}

export interface GraphNode {
  id: string;
  name: string;
  entity: Entity;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  index?: number;
}

export interface GraphLink {
  id: string;
  source: any;
  target: any;
  type: RelationType;
  cardinality: Cardinality;
  label: string;
  sourceAttrId: string;
  targetAttrId: string;
  linkIndex?: number;
  linkCount?: number;
}

// 全量备份数据包格式
export interface BlueprintFullBackup {
  version: string;
  timestamp: number;
  projects: Project[];
  gapTasks: GapAnalysisTask[];
  apiKeys: ProviderKeys;
}
