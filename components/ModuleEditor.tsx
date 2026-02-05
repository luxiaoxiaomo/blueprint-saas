
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Module, FunctionalPoint, Entity, AttributeRelation, RelationType, Cardinality } from '../types';
import { Plus, Trash2, ChevronRight, ChevronDown, Hash, Database, Folder, FolderOpen, Box, Edit2, PlusCircle, Key, PanelLeftClose, PanelLeftOpen, Link, ArrowRight, CornerDownRight, Search, X, Share2, Save, ArrowDownRight, LayoutGrid, ListOrdered, Globe, Settings2, Image as ImageIcon, Upload, Maximize } from 'lucide-react';
import CreateEntityModal from './CreateEntityModal';
import ConfirmModal from './ConfirmModal';

interface ModuleEditorProps {
  modules: Module[];
  entities: Entity[];
  onUpdateModules: (modules: Module[]) => void;
  onDeletePoint: (pointId: string) => void;
  onUpdateEntities: (entities: Entity[]) => void;
}

const RELATION_STRATEGIES: { value: RelationType; label: string }[] = [
  { value: 'Realtime', label: '实时关联' },
  { value: 'Snapshot', label: '数据快照' },
  { value: 'Async', label: '异步同步' },
  { value: 'InitialEditable', label: '初始带出' }
];

const CARDINALITY_OPTIONS: { value: Cardinality; label: string }[] = [
  { value: '1:1', label: '1:1' },
  { value: '1:N', label: '1:N' },
  { value: 'N:1', label: 'N:1' },
  { value: 'N:M', label: 'N:M' }
];

const ModuleEditor: React.FC<ModuleEditorProps> = ({ modules, entities, onUpdateModules, onDeletePoint, onUpdateEntities }) => {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [isHierarchyCollapsed, setIsHierarchyCollapsed] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEntityLinkSearchOpen, setIsEntityLinkSearchOpen] = useState(false);
  const [entitySearchTerm, setEntitySearchTerm] = useState('');
  
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [moduleModalMode, setModuleModalMode] = useState<'create' | 'edit'>('create');
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleParentId, setModuleParentId] = useState<string | null>(null);
  const [moduleNameInput, setModuleNameInput] = useState('');
  const [moduleSortOrder, setModuleSortOrder] = useState(0);

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 删除确认相关状态
  const [confirmConfig, setConfirmConfig] = useState<{ 
    isOpen: boolean; 
    onConfirm: () => void; 
    title: string; 
    message: string; 
  }>({ isOpen: false, onConfirm: () => {}, title: '', message: '' });

  const [activeMapping, setActiveMapping] = useState<{ 
    entityId: string, 
    attributeId: string,
    tempCardinality?: Cardinality,
    tempStrategy?: RelationType,
    tempRelatedEntityId?: string,
    tempRelatedAttributeId?: string
  } | null>(null);
  
  const [associatedSearch, setAssociatedSearch] = useState('');
  const [refSearchTerm, setRefSearchTerm] = useState('');
  const [isRefSearchFocused, setIsRefSearchFocused] = useState(false);
  const refSelectorRef = useRef<HTMLDivElement>(null);
  const entitySelectorRef = useRef<HTMLDivElement>(null);
  const pointNameInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (refSelectorRef.current && !refSelectorRef.current.contains(e.target as Node)) {
        setIsRefSearchFocused(false);
      }
      if (entitySelectorRef.current && !entitySelectorRef.current.contains(e.target as Node)) {
        setIsEntityLinkSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (selectedPointId) {
      const p = allSystemPoints.find(item => item.id === selectedPointId);
      if (p && p.name === '新业务功能点') {
        requestAnimationFrame(() => {
          if (pointNameInputRef.current) {
            pointNameInputRef.current.focus();
            pointNameInputRef.current.select();
          }
        });
      }
    }
  }, [selectedPointId]);

  const handleUpdatePoint = (pointId: string, updates: Partial<FunctionalPoint>) => {
    const updateRecursive = (mods: Module[]): Module[] => (mods || []).map(m => ({
      ...m,
      functionalPoints: (m.functionalPoints || []).map(p => p.id === pointId ? { ...p, ...updates } : p),
      children: m.children ? updateRecursive(m.children) : undefined
    }));
    onUpdateModules(updateRecursive(modules));
  };

  // --- 图片处理逻辑 ---
  const processImageFile = (file: File) => {
    if (!selectedPointId) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const point = allSystemPoints.find(p => p.id === selectedPointId);
      if (point) {
        const currentImages = point.images || [];
        handleUpdatePoint(selectedPointId, { images: [...currentImages, base64] });
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // 只有在没有 Modal 打开且有选中的功能点时才处理粘贴
    if (!selectedPointId || isModuleModalOpen || isCreateModalOpen || activeMapping || previewImage) return;
    
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          processImageFile(blob);
          // 粘贴成功后滚动到底部查看图片
          setTimeout(() => {
            const container = document.getElementById('functional-point-content');
            if (container) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
          }, 100);
        }
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(processImageFile);
    }
  };

  const removeImage = (idx: number) => {
    if (!selectedPointId || !selectedPoint) return;
    const nextImages = (selectedPoint.images || []).filter((_, i) => i !== idx);
    handleUpdatePoint(selectedPointId, { images: nextImages });
  };

  const findModuleById = (mods: Module[], id: string): Module | null => {
    if (!mods || !Array.isArray(mods)) return null;
    for (const m of mods) {
      if (m.id === id) return m;
      if (m.children) {
        const found = findModuleById(m.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const getModuleNameById = (id?: string) => {
    if (!id) return '未分类';
    const find = (mods: Module[]): string | null => {
      for (const m of mods) {
        if (m.id === id) return m.name;
        if (m.children) {
          const res = find(m.children);
          if (res) return res;
        }
      }
      return null;
    };
    return find(modules) || '未知模块';
  };

  const getAllModulesFlat = (mods: Module[], depth = 0): { id: string, name: string, depth: number }[] => {
    let list: { id: string, name: string, depth: number }[] = [];
    if (!mods || !Array.isArray(mods)) return list;
    mods.forEach(m => {
      list.push({ id: m.id, name: m.name, depth });
      if (m.children) {
        list = [...list, ...getAllModulesFlat(m.children, depth + 1)];
      }
    });
    return list;
  };

  const flatModules = useMemo(() => getAllModulesFlat(modules), [modules]);

  const getAllPoints = (mods: Module[]): (FunctionalPoint & { moduleName: string; moduleId: string })[] => {
    let list: (FunctionalPoint & { moduleName: string; moduleId: string })[] = [];
    if (!mods || !Array.isArray(mods)) return list;
    mods.forEach(m => {
      list = [...list, ...(m.functionalPoints || []).map(p => ({ ...p, moduleName: m.name, moduleId: m.id }))];
      if (m.children) list = [...list, ...getAllPoints(m.children)];
    });
    return list;
  };

  const allSystemPoints = useMemo(() => getAllPoints(modules), [modules]);
  const displayPoints = useMemo(() => {
    if (selectedModuleId === null) return allSystemPoints;
    const mod = findModuleById(modules, selectedModuleId);
    return mod ? (mod.functionalPoints || []).map(p => ({ ...p, moduleName: mod.name, moduleId: mod.id })) : [];
  }, [allSystemPoints, selectedModuleId, modules]);

  const selectedPoint = useMemo(() => allSystemPoints.find(p => p.id === selectedPointId), [allSystemPoints, selectedPointId]);

  const referencedByPoints = useMemo(() => {
    if (!selectedPointId) return [];
    return allSystemPoints.filter(p => (p.references || []).includes(selectedPointId));
  }, [allSystemPoints, selectedPointId]);

  const handleAddPoint = () => {
    if (!selectedModuleId) return;
    const newPointId = crypto.randomUUID();
    const newPoint: FunctionalPoint = { id: newPointId, name: '新业务功能点', description: '', entityUsages: [], involvedAttributes: [], images: [] };
    const addRecursive = (mods: Module[]): Module[] => (mods || []).map(m => {
      if (m.id === selectedModuleId) return { ...m, functionalPoints: [...(m.functionalPoints || []), newPoint] };
      if (m.children) return { ...m, children: addRecursive(m.children) };
      return m;
    });
    onUpdateModules(addRecursive(modules));
    setSelectedPointId(newPointId);
  };

  const openAddModuleModal = (parentId: string | null = null) => {
    setModuleModalMode('create');
    setEditingModule(null);
    setModuleParentId(parentId);
    setModuleNameInput('');
    setModuleSortOrder(0);
    setIsModuleModalOpen(true);
  };

  const openEditModuleModal = (m: Module) => {
    setModuleModalMode('edit');
    setEditingModule(m);
    const findParentId = (mods: Module[], targetId: string): string | null => {
      for (const mod of mods) {
        if (mod.children?.some(c => c.id === targetId)) return mod.id;
        if (mod.children) {
          const res = findParentId(mod.children, targetId);
          if (res) return res;
        }
      }
      return null;
    };
    setModuleParentId(findParentId(modules, m.id));
    setModuleNameInput(m.name);
    setModuleSortOrder(m.sortOrder || 0);
    setIsModuleModalOpen(true);
  };

  const handleSaveModule = () => {
    if (!moduleNameInput.trim()) return;
    let nextModules: Module[];
    const removeFromTree = (list: Module[], id: string): Module[] => {
      return (list || []).filter(m => m.id !== id).map(m => ({
        ...m,
        children: m.children ? removeFromTree(m.children, id) : []
      }));
    };

    if (moduleModalMode === 'create') {
      const newModule: Module = {
        id: crypto.randomUUID(),
        name: moduleNameInput,
        description: '',
        functionalPoints: [],
        children: [],
        sortOrder: moduleSortOrder
      };

      if (!moduleParentId) {
        nextModules = [...(modules || []), newModule];
      } else {
        const addRecursive = (mods: Module[]): Module[] => mods.map(m => {
          if (m.id === moduleParentId) return { ...m, children: [...(m.children || []), newModule] };
          if (m.children) return { ...m, children: addRecursive(m.children) };
          return m;
        });
        nextModules = addRecursive(modules);
        setExpandedModules(prev => new Set(prev).add(moduleParentId));
      }
    } else {
      const updatedModule: Module = {
        ...editingModule!,
        name: moduleNameInput,
        sortOrder: moduleSortOrder
      };
      const cleanTree = removeFromTree(modules, updatedModule.id);
      const insertIntoTree = (list: Module[]): Module[] => {
        if (!moduleParentId) return [...list, updatedModule];
        return list.map(m => {
          if (m.id === moduleParentId) return { ...m, children: [...(m.children || []), updatedModule] };
          if (m.children) return { ...m, children: insertIntoTree(m.children) };
          return m;
        });
      };
      nextModules = insertIntoTree(cleanTree);
      if (moduleParentId) setExpandedModules(prev => new Set(prev).add(moduleParentId));
    }
    onUpdateModules(nextModules);
    setIsModuleModalOpen(false);
  };

  const handleDeleteModule = (id: string) => {
    const confirmDelete = () => {
      const delRecursive = (mods: Module[]): Module[] => (mods || []).filter(m => m.id !== id).map(m => ({
        ...m,
        children: m.children ? delRecursive(m.children) : []
      }));
      onUpdateModules(delRecursive(modules));
      if (selectedModuleId === id) setSelectedModuleId(null);
    };

    setConfirmConfig({
      isOpen: true,
      onConfirm: confirmDelete,
      title: "确认删除此功能模块？",
      message: "该操作将移除此模块及其所有下级子模块。模块内的功能点与实体的归属关系也将被解除。"
    });
  };

  const toggleEntityLink = (entityId: string, usageType: 'create' | 'link' = 'link') => {
    if (!selectedPoint) return;
    const currentUsages = selectedPoint.entityUsages || [];
    const existing = currentUsages.find(u => u.entityId === entityId);
    
    if (existing) {
      if (usageType === 'create' && existing.usageType === 'link') {
        handleUpdatePoint(selectedPoint.id, {
          entityUsages: currentUsages.map(u => u.entityId === entityId ? { ...u, usageType: 'create' } : u)
        });
      } else {
        setConfirmConfig({
          isOpen: true,
          onConfirm: () => {
            handleUpdatePoint(selectedPoint.id, {
              entityUsages: currentUsages.filter(u => u.entityId !== entityId),
              involvedAttributes: (selectedPoint.involvedAttributes || []).filter(a => a.entityId !== entityId)
            });
            if (activeMapping?.entityId === entityId) setActiveMapping(null);
          },
          title: "移除实体关联？",
          message: "解除功能点与该实体的映射关系。如果该实体仅在此功能点中被定义，它将变更为独立实体。"
        });
      }
    } else {
      handleUpdatePoint(selectedPoint.id, { entityUsages: [...currentUsages, { entityId, usageType }] });
    }
    setIsEntityLinkSearchOpen(false);
  };

  const handleSaveMapping = () => {
    if (!activeMapping || !activeMapping.tempRelatedEntityId || !activeMapping.tempRelatedAttributeId || !selectedPoint) return;
    const sourceEntityId = activeMapping.entityId;
    const attrId = activeMapping.attributeId;

    const updatedEntities = entities.map(ent => {
      if (ent.id === sourceEntityId) {
        return {
          ...ent,
          attributes: (ent.attributes || []).map(attr => {
            if (attr.id === attrId) {
              const existingRel = (attr.relations || []).find(r => r.functionalPointId === selectedPoint.id);
              let nextRelations = attr.relations || [];
              const relationData: AttributeRelation = {
                id: existingRel?.id || crypto.randomUUID(),
                relationType: activeMapping.tempStrategy || 'Realtime',
                cardinality: activeMapping.tempCardinality || '1:1',
                relatedEntityId: activeMapping.tempRelatedEntityId!,
                relatedAttributeId: activeMapping.tempRelatedAttributeId!,
                functionalPointId: selectedPoint.id,
              };
              if (existingRel) nextRelations = nextRelations.map(r => r.id === relationData.id ? relationData : r);
              else nextRelations = [...nextRelations, relationData];
              return { ...attr, isRelation: true, relations: nextRelations };
            }
            return attr;
          })
        };
      }
      return ent;
    });
    onUpdateEntities(updatedEntities);
    setActiveMapping(null);
  };

  const mainEntities = useMemo(() => (entities || []).filter(e => {
    const usage = (selectedPoint?.entityUsages || []).find(u => u.entityId === e.id);
    return usage?.usageType === 'create';
  }), [entities, selectedPoint]);

  const getModuleStats = (m: Module) => {
    let pointCount = m.functionalPoints?.length || 0;
    let entityIds = new Set<string>();
    m.functionalPoints?.forEach(p => p.entityUsages?.forEach(u => entityIds.add(u.entityId)));
    const recurse = (children: Module[]) => {
      if (!children) return;
      children.forEach(child => {
        pointCount += child.functionalPoints?.length || 0;
        child.functionalPoints?.forEach(p => p.entityUsages?.forEach(u => entityIds.add(u.entityId)));
        if (child.children) recurse(child.children);
      });
    };
    if (m.children) recurse(m.children);
    return { pointCount, entityCount: entityIds.size };
  };

  const renderModuleTree = (mods: Module[], depth = 0) => {
    if (!mods || !Array.isArray(mods)) return null;
    const sortedMods = [...mods].sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0));
    return sortedMods.map(m => {
      const isSelected = selectedModuleId === m.id;
      const truncatedName = m.name.length > 10 ? m.name.slice(0, 10) + '...' : m.name;
      const stats = getModuleStats(m);
      return (
        <div key={m.id} className="relative group/module">
          <div
            onClick={() => { setSelectedModuleId(m.id); setSelectedPointId(null); }}
            className={`flex items-center justify-between py-3 px-4 rounded-2xl cursor-pointer transition-all border mb-2 ${
              isSelected ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 border-blue-600' : 'border-transparent text-slate-600 hover:bg-slate-50'
            }`}
            style={{ marginLeft: `${depth * 1.5}rem` }}
          >
            <div className="flex items-center gap-3 truncate flex-1 min-w-0">
              <button onClick={(e) => { e.stopPropagation(); const next = new Set(expandedModules); if(next.has(m.id)) next.delete(m.id); else next.add(m.id); setExpandedModules(next); }} className={`p-1 rounded-md transition-colors ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                {m.children && m.children.length > 0 ? (expandedModules.has(m.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />) : <div className="w-[16px]" />}
              </button>
              {expandedModules.has(m.id) ? <FolderOpen size={20} className={isSelected ? 'text-white' : 'text-blue-500'} /> : <Folder size={20} className={isSelected ? 'text-white' : 'text-slate-400'} />}
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm" title={m.name}>{truncatedName}</span>
                <span className={`text-[10px] font-medium ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                  {stats.pointCount} 功能点 · <Database size={10} className="inline mr-0.5" />{stats.entityCount} 关联实体
                </span>
              </div>
            </div>
            <div className="items-center gap-1 hidden group-hover/module:flex transition-all ml-2">
              <button onClick={(e) => { e.stopPropagation(); openEditModuleModal(m); }} className={`p-1.5 rounded-lg transition-colors ${isSelected ? 'hover:bg-blue-500 text-white' : 'hover:bg-slate-200 text-slate-600'}`}><Edit2 size={14} /></button>
              <button onClick={(e) => { e.stopPropagation(); openAddModuleModal(m.id); }} className={`p-1.5 rounded-lg transition-colors ${isSelected ? 'hover:bg-blue-500 text-white' : 'hover:bg-blue-50 text-blue-600'}`}><Plus size={14} /></button>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteModule(m.id); }} className={`p-1.5 rounded-lg transition-colors ${isSelected ? 'hover:bg-red-500 text-white' : 'hover:bg-red-50 text-red-500'}`}><Trash2 size={14} /></button>
            </div>
          </div>
          {expandedModules.has(m.id) && m.children && m.children.length > 0 && (
            <div className="transition-all">{renderModuleTree(m.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  const navigateToPoint = (pointId: string) => {
    const pt = allSystemPoints.find(p => p.id === pointId);
    if (pt) {
      const nextExpanded = new Set(expandedModules);
      const expandPath = (mods: Module[]): boolean => {
        if (!mods) return false;
        for (const m of mods) {
          if (m.id === pt.moduleId) return true;
          if (m.children && expandPath(m.children)) {
            nextExpanded.add(m.id);
            return true;
          }
        }
        return false;
      };
      expandPath(modules);
      setExpandedModules(nextExpanded);
      setSelectedModuleId(pt.moduleId);
      setSelectedPointId(pt.id);
    }
  };

  return (
    <div className="flex h-full bg-slate-50/50 overflow-hidden" onPaste={handlePaste}>
      <div className={`${isHierarchyCollapsed ? 'w-16' : 'w-[320px]'} border-r border-slate-200 bg-white flex flex-col transition-all duration-300 relative z-30 shadow-sm`}>
        <div className={`p-6 border-b border-slate-100 flex items-center ${isHierarchyCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isHierarchyCollapsed && <h3 className="font-black text-slate-800 text-lg tracking-tight">模块层级</h3>}
          <div className="flex items-center gap-2">
            {!isHierarchyCollapsed && (
              <button onClick={() => openAddModuleModal(null)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-all" title="添加顶级模块">
                <Plus size={20} />
              </button>
            )}
            <button onClick={() => setIsHierarchyCollapsed(!isHierarchyCollapsed)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
              {isHierarchyCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
          </div>
        </div>
        {!isHierarchyCollapsed && (
          <div className="flex-1 overflow-auto p-4 scrollbar-thin">
            <div onClick={() => { setSelectedModuleId(null); setSelectedPointId(null); }} className={`flex items-center justify-between py-4 px-5 rounded-2xl cursor-pointer transition-all border mb-2 ${selectedModuleId === null ? 'bg-blue-50 border-blue-100 text-blue-700 font-bold' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl ${selectedModuleId === null ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-400'}`}>
                  <Globe size={20} />
                </div>
                <span className="text-sm tracking-tight">全部功能模块</span>
              </div>
              <span className={`text-xs font-black px-2 py-1 rounded-lg ${selectedModuleId === null ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                {allSystemPoints.length}
              </span>
            </div>
            <div className="h-px bg-slate-50 mb-4" />
            {renderModuleTree(modules)}
          </div>
        )}
      </div>

      <div className="w-72 border-r border-slate-200 bg-white flex flex-col z-20 relative shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
          <div className="flex flex-col">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">业务功能点</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{displayPoints.length} 个功能场景</p>
          </div>
          {selectedModuleId && (
            <button onClick={handleAddPoint} className="p-2 hover:bg-blue-600 bg-blue-50 text-blue-600 hover:text-white rounded-xl shadow-sm transition-all">
              <Plus size={18} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {displayPoints.map(p => (
            <div key={p.id} onClick={() => setSelectedPointId(p.id)} className={`group flex items-center p-4 rounded-2xl cursor-pointer transition-all border-2 ${selectedPointId === p.id ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-600 border-transparent hover:bg-slate-50 hover:border-slate-100'}`}>
              <Hash size={14} className={`shrink-0 mr-3 ${selectedPointId === p.id ? 'text-blue-200' : 'text-slate-300'}`} />
              <div className="flex flex-col truncate flex-1 min-w-0">
                <span className="font-bold truncate text-sm">{p.name}</span>
                <div className={`flex items-center gap-2 mt-1 text-[10px] font-medium ${selectedPointId === p.id ? 'text-blue-100' : 'text-slate-400'}`}>
                   <span className="flex items-center gap-1 shrink-0"><Database size={10}/> {p.entityUsages?.length || 0} 实体</span>
                   <span className="opacity-30">•</span>
                   <span className="flex items-center gap-1 shrink-0"><Link size={10}/> {p.references?.length || 0} 引用</span>
                </div>
              </div>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setConfirmConfig({
                    isOpen: true,
                    onConfirm: () => onDeletePoint(p.id),
                    title: "删除功能场景？",
                    message: "该场景及其业务描述、数据映射关系将被永久移除。下游对此场景的引用也将变更为失效状态。"
                  });
                }} 
                className={`opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all ${selectedPointId === p.id ? 'hover:bg-blue-500 text-white' : 'hover:bg-red-50 text-red-500'}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {displayPoints.length === 0 && (
            <div className="py-20 text-center text-slate-300">
              <Box className="w-12 h-12 mx-auto mb-4 opacity-10" />
              <p className="text-xs font-black uppercase tracking-[0.2em] px-6 leading-relaxed">{selectedModuleId === null ? '系统内暂无功能点' : '当前模块暂无功能点'}</p>
            </div>
          )}
        </div>
      </div>

      <div id="functional-point-content" className="flex-1 flex flex-col p-10 overflow-auto bg-slate-50/30 relative z-10 scrollbar-thin">
        {!selectedPoint ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100 flex flex-col items-center max-w-sm text-center">
              <LayoutGrid size={64} className="opacity-10 mb-8" />
              <p className="text-xl font-black text-slate-800 tracking-tight">业务功能梳理</p>
              <p className="text-sm mt-3 font-medium text-slate-400 leading-relaxed">请在左侧选择具体功能点进行梳理。<br/>您可以配置核心数据映射以及跨场景的业务依赖链路。</p>
            </div>
          </div>
        ) : (
          <div className={`max-w-5xl w-full mx-auto space-y-12 animate-in fade-in duration-300 ${activeMapping ? 'mr-[420px]' : ''} transition-all pb-24`}>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <span className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-xl uppercase tracking-[0.2em] shrink-0 shadow-lg shadow-blue-100">{selectedPoint.moduleName}</span>
                <input 
                  ref={pointNameInputRef} 
                  type="text" 
                  value={selectedPoint.name} 
                  onChange={(e) => handleUpdatePoint(selectedPoint.id, { name: e.target.value })} 
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  className="text-4xl font-black text-slate-900 bg-transparent border-none focus:ring-0 p-0 flex-1 truncate tracking-tight" 
                  placeholder="场景名称..." 
                />
              </div>
              <textarea value={selectedPoint.description} onChange={(e) => handleUpdatePoint(selectedPoint.id, { description: e.target.value })} className="w-full text-slate-500 bg-transparent border-none focus:ring-0 p-0 resize-none text-base leading-loose font-medium" placeholder="在此输入详细的业务逻辑描述，例如该功能的前置触发条件、处理流程及数据产出..." rows={3} />
            </div>

            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <h4 className="font-black text-slate-800 flex items-center gap-3 text-xl tracking-tight"><Database size={24} className="text-blue-600" /> 核心数据映射</h4>
                <div className="flex items-center gap-3">
                  <div className="relative" ref={entitySelectorRef}>
                    <button onClick={() => setIsEntityLinkSearchOpen(!isEntityLinkSearchOpen)} className="flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-xs font-black px-5 py-2.5 rounded-2xl transition-all shadow-sm active:scale-95">
                      <Link size={18} /> 关联已有实体
                    </button>
                    {isEntityLinkSearchOpen && (
                      <div className="absolute right-0 mt-3 w-[400px] bg-white border border-slate-200 rounded-[2rem] shadow-2xl z-50 p-4 animate-in zoom-in-95 duration-150 ring-1 ring-slate-100">
                        <div className="relative mb-4">
                          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input autoFocus type="text" placeholder="搜索系统实体资产..." value={entitySearchTerm} onChange={e => setEntitySearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-100" />
                        </div>
                        <div className="max-h-80 overflow-y-auto space-y-1.5 scrollbar-thin">
                          {entities.filter(e => !mainEntities.some(me => me.id === e.id) && (entitySearchTerm === '' || e.name.toLowerCase().includes(entitySearchTerm.toLowerCase()))).map(e => (
                            <button key={e.id} onClick={() => toggleEntityLink(e.id, 'create')} className="w-full text-left px-4 py-3.5 rounded-2xl text-sm font-black text-slate-700 hover:bg-blue-600 hover:text-white flex items-center justify-between group transition-all">
                              <div className="flex flex-col">
                                <span className="truncate">{e.name}</span>
                                <span className="text-[9px] opacity-60 uppercase mt-0.5">{getModuleNameById(e.moduleId)}</span>
                              </div>
                              <Plus size={18} className="text-slate-300 group-hover:white" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-xs font-black px-5 py-2.5 rounded-2xl transition-all shadow-xl active:scale-95"><PlusCircle size={18} /> 初始化业务实体</button>
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-10">
                {mainEntities.map(entity => (
                  <div key={entity.id} className={`w-full max-w-3xl bg-white border rounded-[2.5rem] overflow-hidden shadow-sm transition-all group ${activeMapping?.entityId === entity.id ? 'border-blue-500 ring-8 ring-blue-50' : 'border-slate-100 hover:border-blue-200'}`}>
                    <div className="bg-slate-50/80 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <span className="font-black text-slate-900 text-lg tracking-tight">{entity.name}</span>
                          <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest shadow-md">Primary</span>
                       </div>
                       <button onClick={() => toggleEntityLink(entity.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-xl transition-all opacity-0 group-hover:opacity-100 hover:bg-red-50"><Trash2 size={20} /></button>
                    </div>
                    <div className="p-8 space-y-5">
                      {(entity.attributes || []).map(attr => {
                        const isActive = activeMapping?.entityId === entity.id && activeMapping?.attributeId === attr.id;
                        const currentRel = (attr.relations || []).find(r => r.functionalPointId === selectedPoint.id);
                        return (
                          <div key={attr.id} className="space-y-4">
                             <div onClick={() => setActiveMapping(isActive ? null : { entityId: entity.id, attributeId: attr.id, tempCardinality: currentRel?.cardinality || '1:1', tempStrategy: currentRel?.relationType || 'Realtime', tempRelatedEntityId: currentRel?.relatedEntityId, tempRelatedAttributeId: currentRel?.relatedAttributeId })} className={`w-full flex items-center justify-between px-6 py-5 rounded-[1.8rem] text-sm font-bold transition-all border-2 cursor-pointer ${isActive ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-white border-slate-50 hover:border-blue-100 hover:bg-slate-50/50'}`}>
                               <div className="flex items-center gap-4 truncate">
                                 {attr.isUnique ? (
                                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600'}`}>
                                      <Key size={14} />
                                    </div>
                                 ) : (
                                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-blue-500/50' : 'bg-slate-50 text-slate-400'}`}>
                                      <Box size={14} />
                                    </div>
                                 )}
                                 <span className="truncate text-base">{attr.name}</span>
                               </div>
                               <div className="flex items-center gap-3 shrink-0">
                                 {currentRel && !isActive && <Share2 size={18} className="text-blue-500" />}
                                 <ChevronRight size={18} className={isActive ? 'text-white' : 'text-slate-300'} />
                               </div>
                             </div>
                             {currentRel && !isActive && (
                               <div className="ml-10 flex items-start gap-4 animate-in fade-in slide-in-from-top-1">
                                  <ArrowDownRight size={24} className="text-blue-400 mt-2" />
                                  <div className="flex-1 bg-blue-50/40 p-6 rounded-[2.2rem] border border-blue-100 shadow-sm text-xs space-y-5">
                                     <div className="flex items-center gap-5">
                                        <span className="bg-blue-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-black shadow-md tracking-widest">{currentRel.cardinality}</span>
                                        <div className="w-1.5 h-1.5 bg-blue-200 rounded-full" />
                                        <span className="text-slate-600 font-black bg-white px-4 py-1.5 rounded-xl border border-blue-50 shadow-sm">{RELATION_STRATEGIES.find(s => s.value === currentRel.relationType)?.label}</span>
                                     </div>
                                     <div className="flex items-center gap-4 flex-wrap">
                                        <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-2xl border border-blue-100 shadow-sm text-slate-700 font-black truncate">
                                           <Database size={16} className="text-blue-500" />
                                           {entities.find(e => e.id === currentRel.relatedEntityId)?.name}
                                        </div>
                                        <ArrowRight size={16} className="text-slate-300" />
                                        <div className="flex items-center gap-3 bg-blue-100 text-blue-900 px-5 py-2.5 rounded-2xl border border-blue-200 shadow-inner font-black truncate">
                                           {entities.find(e => e.id === currentRel.relatedEntityId)?.attributes.find(a => a.id === currentRel.relatedAttributeId)?.name}
                                        </div>
                                     </div>
                                  </div>
                               </div>
                             )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <h4 className="font-black text-slate-800 flex items-center gap-3 text-xl tracking-tight"><Link size={24} className="text-blue-600" /> 场景业务链路</h4>
                <div className="relative" ref={refSelectorRef}>
                  <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-[1.5rem] px-6 py-3 shadow-md focus-within:ring-4 focus-within:ring-blue-100 transition-all">
                    <Search size={18} className="text-slate-400" />
                    <input type="text" placeholder="搜索并添加依赖功能场景..." value={refSearchTerm} onFocus={() => setIsRefSearchFocused(true)} onChange={e => setRefSearchTerm(e.target.value)} className="bg-transparent border-none text-sm font-black focus:ring-0 p-0 w-64 placeholder-slate-300" />
                  </div>
                  {isRefSearchFocused && (
                    <div className="absolute right-0 mt-3 w-96 bg-white border border-slate-200 rounded-[2rem] shadow-2xl z-50 p-3 animate-in zoom-in-95 duration-150 ring-1 ring-slate-100">
                      <div className="max-h-80 overflow-y-auto space-y-1.5 scrollbar-thin">
                        {allSystemPoints.filter(p => p.id !== selectedPoint.id && !(selectedPoint.references || []).includes(p.id) && (refSearchTerm === '' || p.name.toLowerCase().includes(refSearchTerm.toLowerCase()))).map(p => (
                          <button key={p.id} onClick={() => { handleUpdatePoint(selectedPoint.id, { references: [...(selectedPoint.references || []), p.id] }); setRefSearchTerm(''); setIsRefSearchFocused(false); }} className="w-full text-left px-4 py-3.5 rounded-2xl text-sm font-black text-slate-700 hover:bg-blue-600 hover:text-white flex items-center justify-between group transition-all">
                            <div className="flex flex-col">
                              <span className="truncate">{p.name}</span>
                              <span className="text-[10px] opacity-60 uppercase mt-0.5">{p.moduleName}</span>
                            </div>
                            <Plus size={18} className="text-slate-300 group-hover:text-white" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-4 border-l-4 border-blue-500">上游依赖 (Depends On)</span>
                  <div className="space-y-4">
                    {(selectedPoint.references || []).map(refId => {
                      const refPoint = allSystemPoints.find(p => p.id === refId);
                      return (
                        <div key={refId} onClick={() => navigateToPoint(refId)} className="bg-white border border-slate-100 rounded-[2rem] p-6 flex items-center justify-between hover:border-blue-400 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer shadow-sm">
                          <div className="flex flex-col truncate flex-1">
                            <span className="text-base font-black text-slate-800 truncate">{refPoint?.name || '未知场景'}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 mt-2 tracking-widest"><Folder size={12} className="text-blue-500" />{refPoint?.moduleName}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <ArrowRight size={20} className="text-blue-500 group-hover:translate-x-2 transition-transform" />
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setConfirmConfig({
                                  isOpen: true,
                                  onConfirm: () => handleUpdatePoint(selectedPoint.id, { references: selectedPoint.references?.filter(id => id !== refId) }),
                                  title: "移除业务链路引用？",
                                  message: "解除当前功能对上游场景的逻辑依赖。该操作不会删除上游场景本身。"
                                });
                              }} 
                              className="p-2 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-xl"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-6">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-4 border-l-4 border-orange-500">下游引用 (Referenced By)</span>
                  <div className="space-y-4">
                    {referencedByPoints.map(refPoint => (
                      <div key={refPoint.id} onClick={() => navigateToPoint(refPoint.id)} className="bg-white border border-slate-100 rounded-[2rem] p-6 flex items-center justify-between hover:border-orange-400 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer shadow-sm">
                        <div className="flex flex-col truncate flex-1">
                          <span className="text-base font-black text-slate-800 truncate">{refPoint.name}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 mt-2 tracking-widest"><Folder size={12} className="text-orange-500" />{refPoint.moduleName}</span>
                        </div>
                        <CornerDownRight size={20} className="text-slate-300 group-hover:text-orange-500 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 业务参考截图区域 - 已移动到最下方 */}
            <div className="space-y-8 pb-10">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <h4 className="font-black text-slate-800 flex items-center gap-3 text-xl tracking-tight"><ImageIcon size={24} className="text-blue-600" /> 业务参考截图</h4>
                <div className="flex items-center gap-3">
                  <input type="file" ref={imageInputRef} onChange={handleImageUpload} multiple accept="image/*" className="hidden" />
                  <button onClick={() => imageInputRef.current?.click()} className="flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-xs font-black px-5 py-2.5 rounded-2xl transition-all shadow-sm active:scale-95">
                    <Upload size={18} /> 点击上传
                  </button>
                  <div className="px-4 py-2.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-2xl border border-blue-100 uppercase tracking-widest">
                    支持剪贴板粘贴 (Ctrl+V)
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {(selectedPoint.images || []).map((img, idx) => (
                  <div key={idx} className="group relative aspect-video bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer">
                    <img src={img} alt="Screenshot" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                       <button onClick={() => setPreviewImage(img)} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all">
                         <Maximize size={18} />
                       </button>
                       <button onClick={() => removeImage(idx)} className="p-2 bg-red-500/80 backdrop-blur-md rounded-full text-white hover:bg-red-600 transition-all">
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </div>
                ))}
                
                {(!selectedPoint.images || selectedPoint.images.length === 0) && (
                   <div className="col-span-full py-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-white/40 group hover:border-blue-200 transition-colors">
                      <div className="bg-slate-50 p-6 rounded-full group-hover:bg-blue-50 transition-colors">
                        <ImageIcon size={48} className="text-slate-200 group-hover:text-blue-200 transition-colors" />
                      </div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-4">暂无业务截图引用</p>
                      <p className="text-[10px] text-slate-300 font-bold mt-1 italic">可直接在此区域按下 Ctrl+V 粘贴剪贴板截图</p>
                   </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeMapping && (
          <div className="fixed top-16 right-0 bottom-0 w-[420px] bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-50">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-2xl">
                  <Settings2 className="text-blue-600 w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <h5 className="text-2xl font-black text-slate-800 tracking-tight">配置关联逻辑</h5>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Logic Node Configuration</p>
                </div>
              </div>
              <button onClick={() => setActiveMapping(null)} className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-all shrink-0">
                <X size={24}/>
              </button>
            </div>
            <div className="p-8 space-y-10 flex-1 overflow-y-auto scrollbar-thin">
              <div className="space-y-8 bg-blue-50/20 p-8 rounded-[3rem] border border-blue-100/50 shadow-inner">
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                    量级 Cardinality
                  </label>
                  <div className="grid grid-cols-2 gap-3.5">
                    {CARDINALITY_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setActiveMapping(prev => prev ? {...prev, tempCardinality: opt.value} : null)} className={`px-6 py-4 rounded-[1.5rem] text-sm font-black border-2 transition-all ${activeMapping.tempCardinality === opt.value ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-white border-slate-50 text-slate-600 hover:border-blue-300'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                    同步策略 Strategy
                  </label>
                  <select value={activeMapping.tempStrategy || ''} onChange={(e) => setActiveMapping(prev => prev ? {...prev, tempStrategy: e.target.value as RelationType} : null)} className="w-full bg-white border-none rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none shadow-sm focus:ring-4 focus:ring-blue-500/10 cursor-pointer">
                    <option value="">请选择同步策略...</option>
                    {RELATION_STRATEGIES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="space-y-6">
                <label className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] px-5 border-l-4 border-slate-900">目标定向 Target Mapping</label>
                <div className="relative">
                  <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input autoFocus type="text" placeholder="搜索并定位目标业务实体..." value={associatedSearch} onChange={e => setAssociatedSearch(e.target.value)} className="w-full pl-16 pr-6 py-4 bg-slate-50 border-none rounded-[1.5rem] text-sm font-black focus:ring-4 focus:ring-slate-100 transition-all shadow-inner placeholder-slate-300" />
                </div>
                <div className="space-y-5 pb-24">
                  {(entities || []).filter(e => e.id !== activeMapping.entityId && e.name.toLowerCase().includes(associatedSearch.toLowerCase())).map(e => {
                    const isSelected = activeMapping.tempRelatedEntityId === e.id;
                    return (
                      <div key={e.id} className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer ${isSelected ? 'bg-blue-50 border-blue-500 shadow-xl translate-x-2' : 'bg-white border-slate-50 hover:border-slate-200'}`}>
                        <div className="flex items-center gap-4 mb-5">
                          <Database size={20} className={`shrink-0 ${isSelected ? 'text-blue-700' : 'text-slate-400'}`} />
                          <span className="font-black text-base text-slate-900 truncate tracking-tight">{e.name}</span>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          {(e.attributes || []).map(targetAttr => {
                            const isAttrSelected = isSelected && activeMapping.tempRelatedAttributeId === targetAttr.id;
                            return (
                              <button key={targetAttr.id} onClick={() => setActiveMapping(prev => prev ? {...prev, tempRelatedEntityId: e.id, tempRelatedAttributeId: targetAttr.id} : null)} className={`px-4 py-2 rounded-xl text-[11px] font-black border-2 transition-all ${isAttrSelected ? 'bg-blue-700 border-blue-700 text-white shadow-md' : 'bg-white border-slate-50 text-slate-500 hover:border-blue-400'}`}>
                                {targetAttr.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="p-8 bg-white border-t border-slate-100 shrink-0">
              <button onClick={handleSaveMapping} disabled={!activeMapping.tempRelatedAttributeId || !activeMapping.tempStrategy || !activeMapping.tempCardinality} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-blue-100 transition-all flex items-center justify-center gap-3.5 disabled:opacity-20 active:scale-95 tracking-[0.2em] uppercase text-sm">
                <Save size={22} /> 保存并生效逻辑映射
              </button>
            </div>
          </div>
        )}
      </div>

      {isModuleModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="flex items-center justify-between p-8 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-2xl">
                  <LayoutGrid className="text-blue-600 w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">{moduleModalMode === 'create' ? '新建功能模块' : '编辑功能模块'}</h2>
              </div>
              <button onClick={() => setIsModuleModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="p-10 space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">模块名称</label>
                  <input 
                    autoFocus 
                    type="text" 
                    value={moduleNameInput} 
                    onChange={(e) => setModuleNameInput(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveModule()}
                    placeholder="请输入模块名称..." 
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-base focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-slate-800" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">上级模块</label>
                  <select value={moduleParentId || ''} onChange={(e) => setModuleParentId(e.target.value || null)} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-base focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700 cursor-pointer">
                    <option value="">(无上级 / 顶级模块)</option>
                    {flatModules.filter(m => m.id !== editingModule?.id).map(m => (
                      <option key={m.id} value={m.id}>{'\u00A0'.repeat(m.depth * 2)}{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <ListOrdered size={14} className="text-blue-500" /> 排序序号
                  </label>
                  <input 
                    type="number" 
                    value={moduleSortOrder} 
                    onChange={(e) => setModuleSortOrder(parseInt(e.target.value, 10) || 0)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveModule()}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-base focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-slate-800" 
                  />
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex gap-4">
              <button onClick={() => setIsModuleModalOpen(false)} className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-500 text-sm font-black rounded-2xl hover:bg-slate-50 transition-all">取消</button>
              <button onClick={handleSaveModule} disabled={!moduleNameInput.trim()} className="flex-1 px-6 py-4 bg-blue-600 text-white text-sm font-black rounded-2xl hover:bg-blue-700 shadow-2xl shadow-blue-100 transition-all disabled:opacity-50 active:scale-95">保存并生效</button>
            </div>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <CreateEntityModal 
          onClose={() => setIsCreateModalOpen(false)} 
          modules={modules}
          initialModuleId={selectedPoint?.moduleId || selectedModuleId}
          onSave={(newEntity) => { 
            onUpdateEntities([...(entities || []), newEntity]); 
            if(selectedPoint) toggleEntityLink(newEntity.id, 'create'); 
            setIsCreateModalOpen(false); 
          }} 
          title={`初始化业务实体`} 
        />
      )}

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
      />

      {/* 图片预览 Modal - 移至根节点，确保最高层级 */}
      {previewImage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-10 animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
           <div className="relative max-w-full max-h-full flex flex-col items-center">
              <div className="absolute -top-16 right-0 flex gap-4">
                 <button onClick={() => setPreviewImage(null)} className="p-3 bg-white/10 hover:bg-red-500/20 hover:text-red-400 rounded-full text-white/70 transition-all group border border-white/10">
                   <X size={28} />
                 </button>
              </div>
              <img src={previewImage} className="max-w-full max-h-[85vh] rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] object-contain border border-white/10" alt="Preview" />
              <div className="mt-6 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                 <p className="text-white/50 text-xs font-bold uppercase tracking-widest">业务参考详情预览</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ModuleEditor;
