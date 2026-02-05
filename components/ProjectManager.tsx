
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Project, Module, Entity, FunctionalPoint, Attribute } from '../types';
import { Plus, Archive, Trash2, ExternalLink, Clock, Database, Layers, CheckCircle, Search, Inbox, Download, Upload, FileSpreadsheet } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface ProjectManagerProps {
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string, description: string) => void;
  onArchiveProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onImportProject: (project: Project) => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ 
  projects, 
  activeProjectId, 
  onSelectProject, 
  onCreateProject, 
  onArchiveProject, 
  onDeleteProject,
  onImportProject
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [filter, setFilter] = useState<'all' | 'archived'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (filter === 'archived') return p.isArchived && matchesSearch;
    return !p.isArchived && matchesSearch;
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateProject(newName, newDesc);
    setNewName('');
    setNewDesc('');
    setIsCreating(false);
  };

  const handleExportExcel = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    
    const wb = XLSX.utils.book_new();

    // 1. 处理功能模块与功能点 (Flatten tree)
    const moduleRows: any[] = [];
    const flattenModules = (mods: Module[], parentName: string = '无') => {
      mods.forEach(m => {
        const currentPath = parentName === '无' ? m.name : `${parentName} > ${m.name}`;
        
        // 记录模块信息
        moduleRows.push({
          '层级路径': currentPath,
          '模块名称': m.name,
          '上级模块': parentName,
          '模块描述': m.description || '',
          '功能点': '---'
        });

        // 记录该模块下的功能点
        (m.functionalPoints || []).forEach(fp => {
          moduleRows.push({
            '层级路径': currentPath,
            '模块名称': m.name,
            '上级模块': parentName,
            '模块描述': '',
            '功能点': fp.name,
            '功能描述': fp.description || ''
          });
        });

        if (m.children && m.children.length > 0) {
          flattenModules(m.children, currentPath);
        }
      });
    };
    flattenModules(project.model.modules);
    const wsModules = XLSX.utils.json_to_sheet(moduleRows);
    XLSX.utils.book_append_sheet(wb, wsModules, "功能架构清单");

    // 2. 处理实体与属性
    const attributeRows: any[] = [];
    const relationRows: any[] = [];

    (project.model.entities || []).forEach(ent => {
      (ent.attributes || []).forEach(attr => {
        attributeRows.push({
          '所属实体': ent.name,
          '实体描述': ent.description || '',
          '属性名称': attr.name,
          '属性类别': attr.category,
          '数据类型': attr.type,
          '必填': attr.required ? '是' : '否',
          '主键': attr.isUnique ? '是' : '否',
          '取值说明/业务逻辑': attr.description || '',
          '枚举/备选值': attr.possibleValues || ''
        });

        // 记录关联关系
        if (attr.isRelation && attr.relations) {
          attr.relations.forEach(rel => {
            const targetEnt = project.model.entities.find(e => e.id === rel.relatedEntityId);
            const targetAttr = targetEnt?.attributes.find(a => a.id === rel.relatedAttributeId);
            
            // 查找关联所属的功能点名称
            let fpName = '全局/通用';
            if (rel.functionalPointId) {
              const findFP = (mods: Module[]): string | null => {
                for (const m of mods) {
                  const found = m.functionalPoints.find(p => p.id === rel.functionalPointId);
                  if (found) return found.name;
                  if (m.children) {
                    const res = findFP(m.children);
                    if (res) return res;
                  }
                }
                return null;
              };
              fpName = findFP(project.model.modules) || '未知场景';
            }

            relationRows.push({
              '源实体': ent.name,
              '源属性': attr.name,
              '目标实体': targetEnt?.name || '未知',
              '目标属性': targetAttr?.name || '未知',
              '关联策略': rel.relationType,
              '数量关系 (Cardinality)': rel.cardinality,
              '触发场景/功能点': fpName
            });
          });
        }
      });
    });

    const wsAttributes = XLSX.utils.json_to_sheet(attributeRows);
    XLSX.utils.book_append_sheet(wb, wsAttributes, "实体属性明细");

    const wsRelations = XLSX.utils.json_to_sheet(relationRows);
    XLSX.utils.book_append_sheet(wb, wsRelations, "数据关联策略");

    // 写入文件
    const filename = `蓝图导出_${project.name}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const handleExportJSON = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    const dataStr = JSON.stringify(project, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Backup_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && json.name && json.model) {
          onImportProject(json as Project);
          alert('项目导入成功！');
        } else {
          alert('导入的文件格式不正确：缺少必要字段。');
        }
      } catch (err) {
        alert('解析文件失败，请确保选择的是有效的项目 JSON 文件。');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = ''; // 重置 input
  };

  const handleDeleteBtnClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setConfirmDeleteId(projectId);
  };

  const handleArchiveBtnClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    e.preventDefault();
    onArchiveProject(projectId);
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col p-8 overflow-y-auto">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        className="hidden" 
      />
      <div className="max-w-6xl auto w-full space-y-8 animate-in fade-in duration-500">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">项目中心</h2>
            <p className="text-slate-500 mt-2 font-medium">管理您的系统分析蓝图与历史记录</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleImportClick}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black transition-all hover:bg-slate-50 active:scale-95"
            >
              <Upload className="w-5 h-5" />
              导入数据包
            </button>
            <button 
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black shadow-xl shadow-blue-100 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              新建分析项目
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
            <button 
              onClick={() => setFilter('all')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              活跃项目 ({projects.filter(p => !p.isArchived).length})
            </button>
            <button 
              onClick={() => setFilter('archived')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'archived' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              已归档 ({projects.filter(p => p.isArchived).length})
            </button>
          </div>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="搜索项目名称..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>

        {isCreating && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-blue-500/20 animate-in zoom-in duration-300">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">项目名称</label>
                  <input 
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="例如：电商系统 2.0 架构分析"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">业务描述</label>
                  <input 
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="描述此项目的梳理目标..."
                  />
                </div>
             </div>
             <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => setIsCreating(false)} className="px-6 py-3 font-bold text-slate-400 hover:text-slate-600">取消</button>
                <button onClick={handleCreate} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-blue-100 transition-all active:scale-95">创建项目</button>
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(project => (
            <div 
              key={project.id} 
              onClick={() => onSelectProject(project.id)}
              className={`group relative bg-white rounded-[2.5rem] border-2 transition-all p-8 cursor-pointer flex flex-col gap-6 ${
                activeProjectId === project.id 
                ? 'border-blue-500 shadow-2xl shadow-blue-100 scale-[1.02]' 
                : 'border-white hover:border-slate-100 hover:shadow-xl'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`p-4 rounded-3xl ${activeProjectId === project.id ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                  <Database className="w-6 h-6" />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={(e) => handleExportExcel(e, project)}
                    title="导出 Excel 业务清单"
                    className="p-2 bg-emerald-50 hover:bg-emerald-600 rounded-xl text-emerald-600 hover:text-white transition-all border border-emerald-100"
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={(e) => handleExportJSON(e, project)}
                    title="备份为 JSON 数据"
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-all"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={(e) => handleArchiveBtnClick(e, project.id)}
                    title={project.isArchived ? "激活项目" : "归档项目"}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-500 transition-all"
                  >
                    <Archive className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={(e) => handleDeleteBtnClick(e, project.id)}
                    className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-800 truncate group-hover:text-blue-600 transition-colors">{project.name}</h3>
                <p className="text-sm text-slate-400 mt-2 font-medium line-clamp-2 min-h-[2.5rem]">{project.description || '暂无项目描述'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-2xl p-3 flex items-center gap-3">
                  <Layers className="w-4 h-4 text-slate-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase">模块</span>
                    <span className="text-xs font-black text-slate-700">{project.model.modules.length}</span>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-slate-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase">实体</span>
                    <span className="text-xs font-black text-slate-700">{project.model.entities.length}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(project.createdAt).toLocaleDateString()}
                </div>
                {activeProjectId === project.id && (
                  <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                    当前活跃
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredProjects.length === 0 && (
            <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-300">
               <Inbox className="w-20 h-20 mb-4 opacity-20" />
               <p className="text-xl font-bold">暂无相关项目数据</p>
               <p className="text-sm font-medium mt-1">您可以点击右上角新建一个分析项目</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => { if(confirmDeleteId) onDeleteProject(confirmDeleteId); }}
        title="确认删除此项目？"
        message="此操作将永久删除该系统的所有架构蓝图、功能模块及实体关联关系，且不可撤销。"
      />
    </div>
  );
};

export default ProjectManager;
