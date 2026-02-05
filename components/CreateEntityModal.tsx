
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Database, Plus, Trash2, LayoutGrid, ChevronDown } from 'lucide-react';
import { Entity, Attribute, Module } from '../types';

interface CreateEntityModalProps {
  onClose: () => void;
  onSave: (entity: Entity) => void;
  modules: Module[];
  initialModuleId?: string | null;
  title?: string;
}

const DATA_TYPES = ['字符串', '数字', '整数', '布尔值', '日期', '日期时间', 'JSON对象', '二进制文件'];

const CreateEntityModal: React.FC<CreateEntityModalProps> = ({ onClose, onSave, modules, initialModuleId, title = "新建实体" }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>(initialModuleId || '');
  const [attributes, setAttributes] = useState<Attribute[]>([
    {
      id: crypto.randomUUID(),
      name: 'ID',
      type: '整数',
      category: '系统属性',
      required: true,
      isUnique: true,
      description: '主键标识',
      isRelation: false,
      relations: []
    }
  ]);

  const lastAttrInputRef = useRef<HTMLInputElement>(null);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  // 当属性列表增加时，聚焦到最新项
  useEffect(() => {
    if (lastAddedId && lastAttrInputRef.current) {
      lastAttrInputRef.current.focus();
      lastAttrInputRef.current.select();
      setLastAddedId(null);
    }
  }, [attributes.length, lastAddedId]);

  const flatModules = useMemo(() => {
    const list: { id: string, name: string, depth: number }[] = [];
    const recurse = (mods: Module[], depth = 0) => {
      mods.forEach(m => {
        list.push({ id: m.id, name: m.name, depth });
        if (m.children) recurse(m.children, depth + 1);
      });
    };
    recurse(modules || []);
    return list;
  }, [modules]);

  const handleAddAttr = () => {
    const id = crypto.randomUUID();
    setAttributes([...attributes, {
      id,
      name: '新属性',
      type: '字符串',
      category: '基础属性',
      required: false,
      isUnique: false,
      description: '',
      isRelation: false,
      relations: []
    }]);
    setLastAddedId(id);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const newEntity: Entity = {
      id: crypto.randomUUID(),
      name,
      description,
      attributes,
      moduleId: selectedModuleId || undefined
    };
    onSave(newEntity);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="flex items-center justify-between p-8 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-100">
              <Database className="text-white w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[65vh] overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">实体名称</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="例如：用户信息、订单详情"
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-slate-800"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <LayoutGrid size={12} className="text-blue-500" /> 归属功能模块
              </label>
              <div className="relative">
                <select
                  value={selectedModuleId}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  disabled={!!initialModuleId}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700 appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">未分类 / 独立实体</option>
                  {flatModules.map(m => (
                    <option key={m.id} value={m.id}>
                      {'\u00A0'.repeat(m.depth * 2)}{m.name}
                    </option>
                  ))}
                </select>
                {!initialModuleId && <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><ChevronDown size={16} /></div>}
              </div>
              {initialModuleId && <p className="text-[10px] font-bold text-blue-500 ml-1">基于当前业务功能点自动锁定</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">业务描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSave()}
                placeholder="描述此实体的业务角色..."
                rows={2}
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-blue-500/10 transition-all resize-none font-medium text-slate-600"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">初始属性清单</label>
              <button onClick={handleAddAttr} className="text-blue-600 text-[10px] font-black hover:bg-blue-50 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 border border-blue-100">
                <Plus className="w-3 h-3" /> 添加新属性
              </button>
            </div>
            <div className="space-y-2.5">
              {attributes.map((attr, idx) => (
                <div key={attr.id} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <input
                    ref={idx === attributes.length - 1 ? lastAttrInputRef : null}
                    type="text"
                    value={attr.name}
                    onChange={(e) => setAttributes(attributes.map((a, i) => i === idx ? { ...a, name: e.target.value } : a))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAttr();
                      }
                    }}
                    className="flex-1 bg-transparent border-none p-0 text-sm font-black text-slate-800 focus:ring-0"
                    placeholder="属性名"
                  />
                  <select
                    value={attr.type}
                    onChange={(e) => setAttributes(attributes.map((a, i) => i === idx ? { ...a, type: e.target.value } : a))}
                    className="bg-white border-none text-[10px] font-black rounded-lg px-2 py-1.5 focus:ring-4 focus:ring-blue-500/5 cursor-pointer shadow-sm text-slate-600"
                  >
                    {DATA_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {idx > 0 && (
                    <button onClick={() => setAttributes(attributes.filter((_, i) => i !== idx))} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 flex gap-4">
          <button onClick={onClose} className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-500 text-sm font-black rounded-2xl hover:bg-slate-50 transition-all">
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 px-6 py-4 bg-blue-600 text-white text-sm font-black rounded-2xl hover:bg-blue-700 shadow-2xl shadow-blue-100 transition-all disabled:opacity-50 active:scale-95"
          >
            确认创建实体
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateEntityModal;
