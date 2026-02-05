
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Entity, Attribute, RelationType, Cardinality, AttributeCategory, Module, FunctionalPoint, AttributeRelation } from '../types';
import { Plus, Trash2, Link, ChevronDown, Info, Key, Package, Search, Hash, X, LayoutGrid, Folder, List } from 'lucide-react';
import CreateEntityModal from './CreateEntityModal';
import ConfirmModal from './ConfirmModal';

const DATA_TYPES = ['字符串', '数字', '整数', '布尔值', '日期', '日期时间', 'JSON对象', '二进制文件'];
const CATEGORIES: AttributeCategory[] = ['基础属性', '关联属性', '状态属性', '派生属性', '系统属性', '配置属性'];
const CARDINALITY_OPTIONS: { value: Cardinality; label: string }[] = [
  { value: '1:1', label: '1:1' },
  { value: '1:N', label: '1:N' },
  { value: 'N:1', label: 'N:1' },
  { value: 'N:M', label: 'N:M' }
];

const RELATION_STRATEGIES: { value: RelationType; label: string }[] = [
  { value: 'Realtime', label: '实时关联' },
  { value: 'Snapshot', label: '数据快照' },
  { value: 'Async', label: '异步同步' },
  { value: 'InitialEditable', label: '初始带出' }
];

interface EntityEditorProps {
  entities: Entity[];
  modules: Module[];
  onUpdate: (entities: Entity[]) => void;
}

const EntityEditor: React.FC<EntityEditorProps> = ({ entities, modules, onUpdate }) => {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(entities[0]?.id || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; onConfirm: () => void; title: string; message: string }>({ isOpen: false, onConfirm: () => {}, title: '', message: '' });

  const lastAddedAttrId = useRef<string | null>(null);
  const attrInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  // 监听新属性添加并自动聚焦
  useEffect(() => {
    if (lastAddedAttrId.current) {
      const input = attrInputsRef.current[lastAddedAttrId.current];
      if (input) {
        input.focus();
        input.select();
      }
      lastAddedAttrId.current = null;
    }
  }, [selectedEntity?.attributes.length]);

  const getModuleName = (moduleId?: string) => {
    if (!moduleId) return '未分类';
    const find = (mods: Module[]): string | null => {
      for (const m of mods) {
        if (m.id === moduleId) return m.name;
        if (m.children) {
          const res = find(m.children);
          if (res) return res;
        }
      }
      return null;
    };
    return find(modules) || '未知模块';
  };

  const allFunctionalPoints = useMemo(() => {
    const points: (FunctionalPoint & { moduleName: string })[] = [];
    const recurse = (mods: Module[]) => {
      mods.forEach(m => {
        (m.functionalPoints || []).forEach(p => points.push({ ...p, moduleName: m.name }));
        if (m.children) recurse(m.children);
      });
    };
    recurse(modules);
    return points;
  }, [modules]);

  const getFunctionalPointCount = (entityId: string) => {
    let count = 0;
    allFunctionalPoints.forEach(p => {
      if ((p.involvedAttributes || []).some(ia => ia.entityId === entityId) || 
          (p.entityUsages || []).some(eu => eu.entityId === entityId)) {
        count++;
      }
    });
    return count;
  };

  const filteredEntities = useMemo(() => {
    return entities.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [entities, searchTerm]);

  const handleUpdateEntity = (id: string, updates: Partial<Entity>) => {
    onUpdate(entities.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const handleUpdateAttribute = (attrId: string, updates: Partial<Attribute>) => {
    if (!selectedEntity) return;
    handleUpdateEntity(selectedEntity.id, {
      attributes: selectedEntity.attributes.map(a => a.id === attrId ? { ...a, ...updates } : a)
    });
  };

  const handleAddAttribute = () => {
    if (!selectedEntity) return;
    const newId = crypto.randomUUID();
    const newAttr: Attribute = { 
      id: newId, 
      name: '新属性', 
      type: '字符串', 
      category: '基础属性',
      required: false,
      isUnique: false,
      description: '', 
      isRelation: false,
      relations: []
    };
    lastAddedAttrId.current = newId;
    handleUpdateEntity(selectedEntity.id, { attributes: [...selectedEntity.attributes, newAttr] });
  };

  const handleAddRelation = (attrId: string) => {
    const newRelation: AttributeRelation = {
      id: crypto.randomUUID(),
      relationType: 'Realtime',
      cardinality: '1:1',
      relatedEntityId: '',
      relatedAttributeId: ''
    };
    const attr = selectedEntity?.attributes.find(a => a.id === attrId);
    if (attr) {
      handleUpdateAttribute(attrId, { relations: [...(attr.relations || []), newRelation] });
    }
  };

  const handleRemoveRelation = (attrId: string, relId: string) => {
    setConfirmConfig({
      isOpen: true,
      onConfirm: () => {
        const attr = selectedEntity?.attributes.find(a => a.id === attrId);
        if (attr) {
          handleUpdateAttribute(attrId, { relations: attr.relations.filter(r => r.id !== relId) });
        }
      },
      title: "删除关联映射？",
      message: "此操作将永久移除该属性在特定场景下的关联策略。如果该属性不再具备任何关联策略且不是“关联属性”，系统逻辑将受影响。"
    });
  };

  const handleUpdateRelation = (attrId: string, relId: string, updates: Partial<AttributeRelation>) => {
    const attr = selectedEntity?.attributes.find(a => a.id === attrId);
    if (attr) {
      handleUpdateAttribute(attrId, {
        relations: attr.relations.map(r => r.id === relId ? { ...r, ...updates } : r)
      });
    }
  };

  return (
    <div className="flex h-full bg-slate-50/50">
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-6 border-b border-slate-100 space-y-4 bg-slate-50/30">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">业务实体库</h3>
            <button 
              onClick={() => setIsCreateModalOpen(true)} 
              className="p-2 hover:bg-blue-600 bg-blue-50 text-blue-600 hover:text-white rounded-xl shadow-sm transition-all"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="搜索实体..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold focus:ring-4 focus:ring-blue-100 transition-all shadow-inner"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
          {filteredEntities.map(e => {
            const pointCount = getFunctionalPointCount(e.id);
            const mName = getModuleName(e.moduleId);
            return (
              <div
                key={e.id}
                onClick={() => setSelectedEntityId(e.id)}
                className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border-2 ${
                  selectedEntityId === e.id ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-600 border-transparent hover:bg-slate-50 hover:border-slate-100'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Package className={`w-5 h-5 flex-shrink-0 ${selectedEntityId === e.id ? 'text-blue-200' : 'text-slate-400'}`} />
                  <div className="flex flex-col truncate">
                    <span className="font-black truncate text-sm tracking-tight">{e.name}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-tighter ${selectedEntityId === e.id ? 'text-blue-100' : 'text-slate-400'}`}>
                      {mName}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pointCount > 0 && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${selectedEntityId === e.id ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {pointCount}
                    </span>
                  )}
                  <button 
                    onClick={(ev) => { 
                      ev.stopPropagation(); 
                      setConfirmConfig({
                        isOpen: true,
                        onConfirm: () => {
                          onUpdate(entities.filter(ent => ent.id !== e.id));
                          if(selectedEntityId === e.id) setSelectedEntityId(null);
                        },
                        title: "确认删除此业务实体？",
                        message: `操作将移除“${e.name}”及其包含的所有属性定义。如果此实体在多个功能点中被引用，相关的功能映射也将失效。`
                      });
                    }}
                    className={`opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-400 rounded-lg transition-colors ${selectedEntityId === e.id ? 'text-white/70 hover:bg-blue-500' : 'hover:bg-red-50'}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col p-10 overflow-y-auto scrollbar-thin">
        {!selectedEntity ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100 flex flex-col items-center max-w-sm text-center">
              <Package className="w-16 h-16 opacity-10 mb-8" />
              <p className="text-xl font-black text-slate-800 tracking-tight">实体数据模型</p>
              <p className="text-sm mt-3 font-medium text-slate-400 leading-relaxed">
                请在左侧选择具体业务实体以编辑其属性与关联关系。<br/>实体由功能模块内的业务场景定义并支持跨模块引用。
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto w-full space-y-12 animate-in fade-in duration-300">
            <div className="space-y-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg flex items-center gap-2">
                    <LayoutGrid size={12} /> 所属模块：{getModuleName(selectedEntity.moduleId)}
                  </span>
                  <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl border border-blue-100">
                    <Hash className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">关联了 {getFunctionalPointCount(selectedEntity.id)} 个功能点</span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                   <input
                    type="text"
                    value={selectedEntity.name}
                    onChange={(e) => handleUpdateEntity(selectedEntity.id, { name: e.target.value })}
                    className="text-4xl font-black text-slate-900 bg-transparent border-none focus:ring-0 p-0 flex-1 tracking-tight"
                  />
                </div>
              </div>
              <textarea
                value={selectedEntity.description}
                onChange={(e) => handleUpdateEntity(selectedEntity.id, { description: e.target.value })}
                className="w-full text-slate-500 bg-transparent border-none focus:ring-0 p-0 resize-none text-base leading-loose font-medium"
                placeholder="在此输入实体的业务逻辑角色定义及生命周期概览..."
                rows={2}
              />
            </div>

            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <h4 className="font-black text-slate-800 flex items-center gap-3 text-xl tracking-tight"><List size={20} className="text-blue-600" /> 属性字段定义</h4>
                <button onClick={handleAddAttribute} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-6 py-3 rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95">
                  <Plus className="w-5 h-5" /> 添加新属性
                </button>
              </div>

              <div className="space-y-6">
                {selectedEntity.attributes.map(attr => (
                  <div key={attr.id} className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all p-8 flex flex-col gap-8 relative overflow-hidden group/attr">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
                      <div className="md:col-span-3 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">属性名称</label>
                        <div className="flex items-center gap-3">
                          <input
                            // Fix: Ensure the ref callback returns void instead of the result of the assignment expression.
                            ref={el => { attrInputsRef.current[attr.id] = el; }}
                            type="text"
                            value={attr.name}
                            onChange={(e) => handleUpdateAttribute(attr.id, { name: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddAttribute();
                              }
                            }}
                            className={`w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 font-black text-sm focus:ring-4 focus:ring-blue-500/10 transition-all ${attr.isUnique ? 'text-blue-700' : 'text-slate-800'}`}
                          />
                          {attr.isUnique && <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl" title="唯一标识项"><Key className="w-5 h-5" /></div>}
                        </div>
                      </div>
                      <div className="md:col-span-3 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">属性类别</label>
                        <select
                          value={attr.category}
                          onChange={(e) => handleUpdateAttribute(attr.id, { category: e.target.value as AttributeCategory })}
                          className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 font-bold text-sm text-slate-600 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">数据类型</label>
                        <select
                          value={attr.type}
                          onChange={(e) => handleUpdateAttribute(attr.id, { type: e.target.value })}
                          className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 font-bold text-sm text-slate-600 focus:ring-4 focus:ring-blue-500/10 transition-all"
                        >
                          {DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2 grid grid-cols-2 gap-4">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">必填</label>
                          <input
                            type="checkbox"
                            checked={attr.required}
                            onChange={(e) => handleUpdateAttribute(attr.id, { required: e.target.checked })}
                            className="w-6 h-6 rounded-lg text-blue-600 focus:ring-blue-500 border-slate-200"
                          />
                        </div>
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">主键</label>
                          <input
                            type="checkbox"
                            checked={attr.isUnique}
                            onChange={(e) => handleUpdateAttribute(attr.id, { isUnique: e.target.checked })}
                            className="w-6 h-6 rounded-lg text-blue-600 focus:ring-blue-500 border-slate-200"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2 flex justify-end items-center">
                        <button 
                          onClick={() => {
                            setConfirmConfig({
                              isOpen: true,
                              onConfirm: () => handleUpdateEntity(selectedEntity.id, { attributes: selectedEntity.attributes.filter(a => a.id !== attr.id) }),
                              title: "删除属性字段？",
                              message: `移除实体属性“${attr.name}”。该字段的历史配置及关联策略也将同步删除。`
                            });
                          }} 
                          className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                        >
                          <Trash2 className="w-6 h-6" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 relative z-10">
                      <label className="flex items-center gap-3 cursor-pointer group/toggle p-3 hover:bg-blue-50 rounded-2xl transition-all border border-transparent hover:border-blue-100 shrink-0">
                        <input
                          type="checkbox"
                          checked={attr.isRelation}
                          onChange={(e) => handleUpdateAttribute(attr.id, { isRelation: e.target.checked })}
                          className="w-6 h-6 rounded-lg text-blue-600 border-slate-200"
                        />
                        <span className="text-sm font-black text-slate-600 group-hover/toggle:text-blue-600">关联属性</span>
                      </label>
                      <div className="flex-1 flex items-center gap-4 bg-slate-50/50 px-5 py-3 rounded-2xl border border-slate-50 focus-within:border-blue-200 transition-all">
                        <Info size={16} className="text-slate-300" />
                        <input 
                          type="text"
                          placeholder="补充业务逻辑或取值说明..."
                          value={attr.description}
                          onChange={(e) => handleUpdateAttribute(attr.id, { description: e.target.value })}
                          className="w-full bg-transparent border-none p-0 text-xs font-bold text-slate-500 focus:ring-0 placeholder:text-slate-300"
                        />
                      </div>
                    </div>

                    {attr.isRelation && (
                      <div className="space-y-4 pt-6 border-t border-blue-50 bg-blue-50/20 p-8 rounded-[2rem] animate-in fade-in slide-in-from-top-4 relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">关联策略定义</span>
                            <span className="text-xs font-bold text-blue-400 mt-1">此属性在不同业务功能场景下的语义映射</span>
                          </div>
                          <button onClick={() => handleAddRelation(attr.id)} className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-white px-5 py-2.5 rounded-2xl border border-blue-100 shadow-sm hover:bg-blue-600 hover:text-white transition-all">
                            <Plus size={14} /> 新增跨场景关联
                          </button>
                        </div>
                        
                        <div className="space-y-4">
                          {(attr.relations || []).map((rel) => (
                            <div key={rel.id} className="grid grid-cols-1 md:grid-cols-11 gap-6 items-end bg-white p-6 rounded-[1.8rem] border border-blue-100/50 shadow-sm hover:shadow-md transition-all">
                              <div className="md:col-span-3 space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">触发场景</label>
                                <select
                                  value={rel.functionalPointId || ''}
                                  onChange={(e) => handleUpdateRelation(attr.id, rel.id, { functionalPointId: e.target.value })}
                                  className="w-full bg-slate-50 border-none text-[11px] font-black rounded-xl py-2.5 px-3 focus:ring-4 focus:ring-blue-100 transition-all"
                                >
                                  <option value="">(通用全局关联)</option>
                                  {allFunctionalPoints.map(p => (
                                    <option key={p.id} value={p.id}>[{p.moduleName}] {p.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="md:col-span-1 space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">量级</label>
                                <select
                                  value={rel.cardinality}
                                  onChange={(e) => handleUpdateRelation(attr.id, rel.id, { cardinality: e.target.value as Cardinality })}
                                  className="w-full bg-slate-50 border-none text-[11px] font-black rounded-xl py-2.5 px-3 focus:ring-4 focus:ring-blue-100 transition-all"
                                >
                                  {CARDINALITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                              </div>

                              <div className="md:col-span-2 space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">策略</label>
                                <select
                                  value={rel.relationType}
                                  onChange={(e) => handleUpdateRelation(attr.id, rel.id, { relationType: e.target.value as RelationType })}
                                  className="w-full bg-slate-50 border-none text-[11px] font-black rounded-xl py-2.5 px-3 focus:ring-4 focus:ring-blue-100 transition-all"
                                >
                                  {RELATION_STRATEGIES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                              </div>

                              <div className="md:col-span-2 space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">指向实体</label>
                                <select
                                  value={rel.relatedEntityId}
                                  onChange={(e) => handleUpdateRelation(attr.id, rel.id, { relatedEntityId: e.target.value, relatedAttributeId: '' })}
                                  className="w-full bg-slate-50 border-none text-[11px] font-black rounded-xl py-2.5 px-3 focus:ring-4 focus:ring-blue-100 transition-all"
                                >
                                  <option value="">选择目标...</option>
                                  {entities.filter(ent => ent.id !== selectedEntity.id).map(ent => (
                                    <option key={ent.id} value={ent.id}>{ent.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="md:col-span-2 space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">指向属性</label>
                                <select
                                  disabled={!rel.relatedEntityId}
                                  value={rel.relatedAttributeId}
                                  onChange={(e) => handleUpdateRelation(attr.id, rel.id, { relatedAttributeId: e.target.value })}
                                  className="w-full bg-slate-50 border-none text-[11px] font-black rounded-xl py-2.5 px-3 disabled:opacity-30 focus:ring-4 focus:ring-blue-100 transition-all"
                                >
                                  <option value="">选择字段...</option>
                                  {entities.find(e => e.id === rel.relatedEntityId)?.attributes.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="md:col-span-1 flex justify-center pb-2">
                                <button onClick={() => handleRemoveRelation(attr.id, rel.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          ))}

                          {(!attr.relations || attr.relations.length === 0) && (
                            <div className="text-center py-10 border-2 border-dashed border-blue-100 rounded-[1.8rem] bg-white/40">
                              <p className="text-[10px] font-black text-blue-300 uppercase tracking-[0.3em]">暂无特定场景关联逻辑，请添加或从功能模块页注入</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <CreateEntityModal 
          onClose={() => setIsCreateModalOpen(false)}
          modules={modules}
          onSave={(newEntity) => {
            onUpdate([...entities, newEntity]);
            setSelectedEntityId(newEntity.id);
            setIsCreateModalOpen(false);
          }}
          title="新建业务实体"
        />
      )}

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
      />
    </div>
  );
};

export default EntityEditor;
