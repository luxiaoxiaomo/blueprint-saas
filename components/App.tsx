
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from './Sidebar';
import AnalysisChatModal from './AnalysisChatModal';
import EntityEditor from './EntityEditor';
import ModuleEditor from './ModuleEditor';
import SystemGraph from './SystemGraph';
import FunctionGraph from './FunctionGraph';
import GapAnalysis from './GapAnalysis';
import TaskCenter from './TaskCenter';
import ProjectManager from './ProjectManager';
import SystemSettings from './SystemSettings';
import { MemberManagement } from './MemberManagement';
import { DepartmentManagement } from './DepartmentManagement';
import { ImportDataModal } from './ImportDataModal';
import { BackupImportModal } from './BackupImportModal';
import AuthModal from './AuthModal';
import AuditLogViewer from './AuditLogViewer';
import { SystemModel, ViewMode, AnalysisTask, Project, Entity, Module, ChatMessage, GapAnalysisTask, AIModelType, AIModelProfile, ProviderKeys, BlueprintFullBackup } from '../types';
import { Database, RefreshCw, ChevronDown, Cpu, Settings, LogOut, User, Upload, FileText } from 'lucide-react';
import { analyzeSystemImage } from '../services/geminiService';
import { apiService } from '../services/apiService';

const AI_MODELS: AIModelProfile[] = [
  { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro', provider: 'Google', color: 'bg-indigo-600' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', provider: 'Google', color: 'bg-blue-500' },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI', color: 'bg-emerald-600' },
  { id: 'grok-2', label: 'Grok-2', provider: 'xAI', color: 'bg-slate-900' },
  { id: 'deepseek-chat', label: 'DeepSeek-V3', provider: 'DeepSeek', color: 'bg-blue-400' },
  { id: 'doubao-pro', label: '豆包 Pro', provider: 'ByteDance', color: 'bg-blue-700' },
  { id: 'qwen-max', label: '通义千问 Max', provider: 'Alibaba', color: 'bg-purple-600' },
  { id: 'gemini-flash-lite-latest', label: 'Gemini Lite', provider: 'Google', color: 'bg-cyan-500' },
];

const generateSecureId = () => {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
  } catch (e) {}
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(apiService.isAuthenticated());
  const [showAuthModal, setShowAuthModal] = useState(!apiService.isAuthenticated());
  const [currentUser, setCurrentUser] = useState(apiService.getCurrentUser());
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [currentOrganizationId, setCurrentOrganizationId] = useState<string>('default-org-id'); // 临时使用默认组织ID
  
  const [viewMode, setViewMode] = useState<ViewMode>('projects');
  const [activeChatTaskId, setActiveChatTaskId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBackupImportModalOpen, setIsBackupImportModalOpen] = useState(false);
  const [restoredImportResult, setRestoredImportResult] = useState<SystemModel | null>(null);
  
  // 从localStorage加载项目、任务和API密钥（用于性能优化和离线缓存）
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('blueprint-projects');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => localStorage.getItem('blueprint-active-project'));
  const [gapTasks, setGapTasks] = useState<GapAnalysisTask[]>(() => {
    const saved = localStorage.getItem('blueprint-gap-tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [apiKeys, setApiKeys] = useState<ProviderKeys>(() => {
    const saved = localStorage.getItem('blueprint-api-keys');
    return saved ? JSON.parse(saved) : {};
  });

  // 自动同步到localStorage（仅用于缓存）
  useEffect(() => { localStorage.setItem('blueprint-projects', JSON.stringify(projects)); }, [projects]);
  useEffect(() => { if (activeProjectId) localStorage.setItem('blueprint-active-project', activeProjectId); }, [activeProjectId]);
  useEffect(() => { localStorage.setItem('blueprint-gap-tasks', JSON.stringify(gapTasks)); }, [gapTasks]);
  useEffect(() => { localStorage.setItem('blueprint-api-keys', JSON.stringify(apiKeys)); }, [apiKeys]);

  // 在组件挂载时，如果用户已登录，从服务器加载项目数据
  useEffect(() => {
    if (isAuthenticated) {
      apiService.getProjects().then(serverProjects => {
        setProjects(serverProjects);
      }).catch(err => {
        console.error('加载项目失败:', err);
      });
    }
  }, [isAuthenticated]);
  
  const [isNewChatDraft, setIsNewChatDraft] = useState(false);
  const [graphModuleId, setGraphModuleId] = useState<string | null>(null);
  const [graphPointId, setGraphPointId] = useState<string | null>(null);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  
  const [graphSelectedModuleIds, setGraphSelectedModuleIds] = useState<Set<string>>(new Set());
  const [graphSelectedPointIds, setGraphSelectedPointIds] = useState<Set<string>>(new Set());

  const [selectedModel, setSelectedModel] = useState<AIModelType>('gemini-3-pro-preview');

  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);
  const model = useMemo(() => activeProject?.model || { name: '未命名', modules: [], entities: [] }, [activeProject]);
  const tasks = activeProject?.tasks || [];



  const handleStartAIS梳理 = useCallback(() => {
    if (!activeProjectId) return;
    setIsNewChatDraft(true);
    setActiveChatTaskId('draft');
  }, [activeProjectId]);

  const handleCreateTaskFromDraft = (initialMessages: ChatMessage[]) => {
    if (!activeProjectId) return null;
    const taskId = generateSecureId();
    const newTask: AnalysisTask = { id: taskId, name: `AI 梳理任务 ${new Date().toLocaleTimeString()}`, status: 'Analyzing', messages: initialMessages, files: [], createdAt: Date.now() };
    setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, tasks: [newTask, ...p.tasks] } : p));
    setIsNewChatDraft(false);
    setActiveChatTaskId(taskId);
    return taskId;
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setShowAuthModal(false);
    setCurrentUser(apiService.getCurrentUser());
    loadProjects();
  };

  const loadProjects = () => {
    // 从服务器加载项目
    apiService.getProjects().then(serverProjects => {
      setProjects(serverProjects);
    }).catch(err => {
      console.error('加载项目失败:', err);
    });
  };

  const handleLogout = () => {
    apiService.logout();
    setIsAuthenticated(false);
    setShowAuthModal(true);
    setCurrentUser(null);
    setProjects([]);
    setActiveProjectId(null);
  };

  const handleCreateProject = (name: string, description: string) => {
    apiService.createProject(name, description).then(newProject => {
      setProjects(prev => [...prev, newProject]);
      setActiveProjectId(newProject.id);
      setViewMode('modules');
    }).catch(err => {
      console.error('创建项目失败:', err);
      alert('创建项目失败: ' + err.message);
    });
  };

  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
    const p = projects.find(it => it.id === id);
    setViewMode(p?.isArchived ? 'projects' : 'modules');
    setGraphSelectedModuleIds(new Set());
    setGraphSelectedPointIds(new Set());
  };

  const handleUpdateModules = (modules: Module[]) => {
    if (!activeProjectId) return;
    setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, model: { ...p.model, modules } } : p));
  };

  const handleDeletePoint = (pointId: string) => {
    if (!activeProjectId) return;
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      const deleteRecursive = (mods: Module[]): Module[] => (mods || []).map(m => ({
        ...m,
        functionalPoints: (m.functionalPoints || []).filter(fp => fp.id !== pointId),
        children: m.children ? deleteRecursive(m.children) : undefined
      }));
      return { ...p, model: { ...p.model, modules: deleteRecursive(p.model.modules) } };
    }));
  };

  const handleUpdateEntities = (entities: Entity[]) => {
    if (!activeProjectId) return;
    setProjects(prev => prev.map(p => {
        if (p.id !== activeProjectId) return p;
        const entityIds = new Set(entities.map(e => e.id));
        const syncRecursive = (mods: Module[]): Module[] => (mods || []).map(m => ({
            ...m,
            functionalPoints: (m.functionalPoints || []).map(fp => ({
                ...fp,
                entityUsages: (fp.entityUsages || []).filter(u => entityIds.has(u.entityId)),
                involvedAttributes: (fp.involvedAttributes || []).filter(a => entityIds.has(a.entityId))
            })),
            children: m.children ? syncRecursive(m.children) : undefined
        }));
        return { ...p, model: { ...p.model, entities, modules: syncRecursive(p.model.modules) } };
    }));
  };

  const handleApplyResult = (newModel: SystemModel, merge: boolean = false) => {
    if (!activeProjectId || !newModel) return;
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      if (!merge) return { ...p, model: { ...p.model, ...newModel } };
      
      const mergedModules = [...(p.model.modules || [])];
      (newModel.modules || []).forEach(newMod => {
        const existing = mergedModules.find(m => m.name === newMod.name);
        if (existing) {
          existing.functionalPoints = [...(existing.functionalPoints || []), ...(newMod.functionalPoints || [])];
        } else {
          mergedModules.push(newMod);
        }
      });

      const mergedEntities = [...(p.model.entities || [])];
      (newModel.entities || []).forEach(newEnt => {
        const existing = mergedEntities.find(e => e.name === newEnt.name);
        if (existing) {
          existing.attributes = [...(existing.attributes || []), ...(newEnt.attributes || [])];
        } else {
          mergedEntities.push(newEnt);
        }
      });

      return { ...p, model: { ...p.model, modules: mergedModules, entities: mergedEntities } };
    }));
    alert(merge ? '数据已合并到当前蓝图！' : '蓝图数据已全量更新！');
    setViewMode('modules');
  };

  const updateTaskMessages = (taskId: string, messages: ChatMessage[]) => {
    setProjects(prev => prev.map(p => ({ ...p, tasks: (p.tasks || []).map(t => t.id === taskId ? { ...t, messages } : t) })));
  };

  const updateTaskStatus = (taskId: string, status: AnalysisTask['status'], error?: string) => {
    setProjects(prev => prev.map(p => ({ ...p, tasks: (p.tasks || []).map(t => t.id === taskId ? { ...t, status, error: error || t.error } : t) })));
  };

  const updateTaskResult = (taskId: string, result: SystemModel) => {
     setProjects(prev => prev.map(p => ({ ...p, tasks: (p.tasks || []).map(t => t.id === taskId ? { ...t, status: 'Completed', result } : t) })));
  };

  const activeChatTask = useMemo(() => {
    if (activeChatTaskId === 'draft') {
      return { 
        id: 'draft', 
        name: '新建梳理会话', 
        status: 'Completed' as const,
        messages: [{ id: 'welcome', role: 'model' as const, content: '您好！我是您的系统分析助手。请描述您的系统逻辑或上传相关文档。', timestamp: Date.now() }], 
        files: [], 
        createdAt: Date.now() 
      } as AnalysisTask;
    }
    return (tasks || []).find(t => t.id === activeChatTaskId);
  }, [tasks, activeChatTaskId]);

  const ongoingTasksCount = (tasks || []).filter(t => t.status === 'Analyzing' || t.status === 'Synchronizing').length;
  const currentProfile = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];

  const handleOpenVisionImportResult = (task: AnalysisTask) => {
    if (task.result) {
       setRestoredImportResult(task.result);
       setIsImportModalOpen(true);
    }
  };

  const handleTaskCreated = (task: AnalysisTask) => {
     if (!activeProjectId) return;
     
     setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, tasks: [task, ...p.tasks] } : p));
     
     if (task.taskType === 'VisionImport') {
        setTimeout(() => {
          const images = task.files.map(f => f.data);
          analyzeSystemImage(images, selectedModel).then(res => {
            updateTaskResult(task.id, res);
          }).catch(err => {
            console.error("AI解析背景任务失败", err);
            updateTaskStatus(task.id, 'Failed', err instanceof Error ? err.message : "图片解析失败");
          });
        }, 10);
     }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <Sidebar 
        viewMode={viewMode} 
        setViewMode={setViewMode} 
        onUploadClick={handleStartAIS梳理} 
        activeTasksCount={ongoingTasksCount}
        onImportClick={() => { setRestoredImportResult(null); setIsImportModalOpen(true); }}
      />
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-20 shadow-sm shrink-0">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-shrink">
            <div className="min-w-0">
              <h2 className="font-black text-slate-800 text-sm md:text-lg uppercase tracking-tight truncate">{activeProject ? activeProject.name : (viewMode === 'settings' ? '全局配置' : "选择项目")}</h2>
              {activeProject && <div className={`mt-1 inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${activeProject.isArchived ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>{activeProject.isArchived ? '已归档' : '编辑中'}</div>}
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
             <div className="relative">
                <button 
                  onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                  className="flex items-center gap-2.5 px-2 md:px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all min-w-[120px] md:min-w-[180px]"
                >
                  <div className={`w-2 h-2 rounded-full ${currentProfile.color} animate-pulse`} />
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest truncate">{currentProfile.label}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 ml-auto transition-transform flex-shrink-0 ${isModelSelectorOpen ? 'rotate-180' : ''}`} />
                </button>

                {isModelSelectorOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsModelSelectorOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="p-3 border-b border-slate-50 bg-slate-50/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Cpu size={12} className="text-blue-500" /> 分析引擎切换
                        </p>
                      </div>
                      <div className="p-1.5 max-h-[60vh] overflow-y-auto">
                        {AI_MODELS.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => { setSelectedModel(m.id); setIsModelSelectorOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${selectedModel === m.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}
                          >
                            <div className={`w-2 h-2 rounded-full ${m.color}`} />
                            <div className="flex flex-col items-start">
                              <span className="text-xs font-black">{m.label}</span>
                              <span className="text-[8px] font-bold opacity-50 uppercase tracking-tighter">{m.provider}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                      <button 
                        onClick={() => { setViewMode('settings'); setIsModelSelectorOpen(false); }}
                        className="w-full p-3 text-[10px] font-black text-slate-400 border-t border-slate-50 hover:bg-slate-50 flex items-center justify-center gap-2 uppercase"
                      >
                        <Settings size={12} /> 进入详细配置�?                      </button>
                    </div>
                  </>
                )}
             </div>

             {/* 用户信息和操作按�?*/}
             {currentUser && (
               <div className="flex items-center gap-1 md:gap-2">
                 <button onClick={() => setViewMode('projects')} className="hidden md:flex items-center gap-1.5 text-[10px] font-black text-slate-600 hover:text-blue-600 transition-all uppercase px-2 md:px-3 py-1.5 hover:bg-blue-50 rounded-xl" title="切换项目">
                   <RefreshCw className="w-3.5 h-3.5" /> <span className="hidden lg:inline">切换项目</span>
                 </button>
                 
                 <div className="hidden md:block h-6 w-px bg-slate-200" />
                 
                 <button onClick={() => setIsBackupImportModalOpen(true)} className="hidden md:flex items-center gap-1.5 text-[10px] font-black text-slate-600 hover:text-green-600 transition-all uppercase px-2 md:px-3 py-1.5 hover:bg-green-50 rounded-xl" title="导入备份">
                   <Upload className="w-3.5 h-3.5" /> <span className="hidden lg:inline">导入备份</span>
                 </button>
                 
                 <div className="hidden md:block h-6 w-px bg-slate-200" />
                 
                 <button 
                   onClick={() => setShowAuditLog(true)}
                   className="hidden md:flex items-center gap-1.5 text-[10px] font-black text-slate-600 hover:text-purple-600 transition-all uppercase px-2 md:px-3 py-1.5 hover:bg-purple-50 rounded-xl"
                   title="审计日志"
                 >
                   <FileText className="w-3.5 h-3.5" /> <span className="hidden lg:inline">审计日志</span>
                 </button>
                 
                 <div className="hidden md:block h-6 w-px bg-slate-200" />
                 
                 <div className="flex items-center gap-2 px-2 md:px-3 py-1.5 bg-slate-50 rounded-xl">
                   <User size={14} className="text-slate-600 flex-shrink-0" />
                   <span className="text-xs font-medium text-slate-700 hidden md:inline truncate max-w-[100px]">{currentUser.name}</span>
                 </div>
                 
                 <button 
                   onClick={handleLogout}
                   className="flex items-center gap-1.5 text-[10px] font-black text-slate-600 hover:text-red-600 transition-all uppercase px-2 md:px-3 py-1.5 hover:bg-red-50 rounded-xl"
                   title="登出"
                 >
                   <LogOut className="w-3.5 h-3.5" /> <span className="hidden md:inline">登出</span>
                 </button>
               </div>
             )}
          </div>
        </header>
        
        <div className="flex-1 overflow-hidden relative">
          {!activeProject && !['projects', 'gap-analysis', 'settings'].includes(viewMode) ? (
            <div className="h-full flex flex-col items-center justify-center bg-white"><Database className="w-24 h-24 text-slate-100 mb-6" /><h3 className="text-2xl font-black text-slate-800">尚未选择项目</h3><button onClick={() => setViewMode('projects')} className="mt-8 bg-blue-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl">项目管理中心</button></div>
          ) : (
            <>
              {viewMode === 'projects' && (
                <ProjectManager 
                  projects={projects} 
                  activeProjectId={activeProjectId} 
                  onSelectProject={handleSelectProject} 
                  onCreateProject={handleCreateProject} 
                  onArchiveProject={(id) => setProjects(prev => prev.map(p => p.id === id ? {...p, isArchived: !p.isArchived} : p))} 
                  onDeleteProject={(id) => { setProjects(prev => prev.filter(p => p.id !== id)); if (activeProjectId === id) setActiveProjectId(null); }} 
                  onImportProject={(p) => setProjects(prev => [...prev, p])} 
                />
              )}
              {viewMode === 'modules' && <ModuleEditor modules={model.modules || []} entities={model.entities || []} onUpdateModules={handleUpdateModules} onDeletePoint={handleDeletePoint} onUpdateEntities={handleUpdateEntities} />}
              {viewMode === 'entities' && <EntityEditor entities={model.entities || []} modules={model.modules || []} onUpdate={handleUpdateEntities} />}
              {viewMode === 'members' && <MemberManagement organizationId={currentOrganizationId} />}
              {viewMode === 'departments' && <DepartmentManagement organizationId={currentOrganizationId} />}
              {viewMode === 'graph' && (
                <SystemGraph 
                  model={model} 
                  onDeletePoint={handleDeletePoint} 
                  initialModuleId={graphModuleId} 
                  initialPointId={graphPointId} 
                  onSceneSelect={(m, p) => { setGraphModuleId(m); setGraphPointId(p); }}
                  selectedModuleIds={graphSelectedModuleIds}
                  setSelectedModuleIds={setGraphSelectedModuleIds}
                  selectedPointIds={graphSelectedPointIds}
                  setSelectedPointIds={setGraphSelectedPointIds}
                />
              )}
              {viewMode === 'function-graph' && <FunctionGraph model={model} />}
              {viewMode === 'gap-analysis' && <GapAnalysis projects={projects} gapTasks={gapTasks} onCreateTask={(t) => setGapTasks(prev => [t, ...prev])} onUpdateTask={(id, u) => setGapTasks(prev => prev.map(t => t.id === id ? {...t, ...u} : t))} onDeleteTask={(id) => setGapTasks(prev => prev.filter(t => t.id !== id))} selectedModel={selectedModel} />}
              {viewMode === 'tasks' && <TaskCenter tasks={tasks || []} onUpdateTaskStatus={updateTaskStatus} onDeleteTask={(id) => setProjects(prev => prev.map(p => ({ ...p, tasks: p.tasks.filter(t => t.id !== id) })))} onOpenChat={setActiveChatTaskId} onOpenVisionImport={handleOpenVisionImportResult} onApplyResult={handleApplyResult} onUndoApply={() => {}} />}
              {viewMode === 'settings' && (
                <SystemSettings 
                  selectedModel={selectedModel} 
                  onModelSelect={setSelectedModel} 
                  aiModels={AI_MODELS} 
                  apiKeys={apiKeys}
                  onApiKeysChange={setApiKeys}
                />
              )}
            </>
          )}
        </div>
      </main>
      {activeChatTask && <AnalysisChatModal task={activeChatTask} onClose={() => setActiveChatTaskId(null)} onMinimize={() => setActiveChatTaskId(null)} onUpdateTaskMessages={updateTaskMessages} onUpdateTaskStatus={updateTaskStatus} onApplyModel={handleApplyResult} onCreateTask={handleCreateTaskFromDraft} selectedModel={selectedModel} currentProfile={currentProfile} />}
      {isImportModalOpen && <ImportDataModal onClose={() => { setIsImportModalOpen(false); setRestoredImportResult(null); }} onApply={(newModel, merge) => handleApplyResult(newModel, merge)} selectedModel={selectedModel} initialResult={restoredImportResult} onTaskCreated={handleTaskCreated} />}
      {isBackupImportModalOpen && <BackupImportModal isOpen={isBackupImportModalOpen} onClose={() => setIsBackupImportModalOpen(false)} onSuccess={loadProjects} />}
      {showAuthModal && <AuthModal onClose={() => {}} onSuccess={handleAuthSuccess} />}
      {showAuditLog && <AuditLogViewer onClose={() => setShowAuditLog(false)} />}
    </div>
  );
};

export default App;

