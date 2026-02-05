
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Project, GapReport, GapAnalysisTask, EntityComparison, AIModelType, EnumMapping, GapItem } from '../types';
import { compareSystems } from '../services/geminiService';
import { AlertTriangle, CheckCircle, Info, XCircle, ArrowRight, Loader2, GitCompare, List, BarChart3, AlertCircle, History, Clock, ChevronRight, CheckCircle2, Table, Hash, ListTree, FileDown } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface GapAnalysisProps {
  projects: Project[];
  gapTasks: GapAnalysisTask[];
  onCreateTask: (task: GapAnalysisTask) => void;
  onUpdateTask: (id: string, updates: Partial<GapAnalysisTask>) => void;
  onDeleteTask: (id: string) => void;
  selectedModel: AIModelType;
}

const GapAnalysis: React.FC<GapAnalysisProps> = ({ projects, gapTasks, onCreateTask, onUpdateTask, onDeleteTask, selectedModel }) => {
  const [sourceId, setSourceId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'entities' | 'fields' | 'enums'>('entities');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const activeTask = useMemo(() => (gapTasks || []).find(t => t.id === activeTaskId), [gapTasks, activeTaskId]);
  const report = activeTask?.report;

  const currentSourceProject = projects.find(p => p.id === sourceId);
  const currentTargetProject = projects.find(p => p.id === targetId);

  const handleStartAnalysis = async () => {
    if (!currentSourceProject || !currentTargetProject) return;
    
    const taskId = crypto.randomUUID();
    const newTask: GapAnalysisTask = {
      id: taskId,
      sourceProjectId: sourceId,
      targetProjectId: targetId,
      status: 'Analyzing',
      createdAt: Date.now()
    };
    
    onCreateTask(newTask);
    setActiveTaskId(taskId);

    try {
      const res = await compareSystems(currentSourceProject.model, currentTargetProject.model, selectedModel);
      onUpdateTask(taskId, { 
        status: 'Completed', 
        report: {
          ...res,
          sourceProjectId: sourceId,
          sourceProjectName: currentSourceProject.name,
          targetProjectId: targetId,
          targetProjectName: currentTargetProject.name
        } 
      });
    } catch (err) {
      onUpdateTask(taskId, { 
        status: 'Failed', 
        error: err instanceof Error ? err.message : "分析引擎连接失败" 
      });
    }
  };

  const handleExportExcel = () => {
    if (!report) return;
    setIsExporting(true);

    try {
      const wb = XLSX.utils.book_new();

      // 1. 实体映射表
      const entityRows = report.entityComparisons.map(ec => ({
        '旧系统实体名 (Source)': ec.sourceEntityName,
        '新系统实体名 (Target)': ec.targetEntityName || '—',
        '对应关系': ec.relationshipType,
        '对标状态': ec.status,
        '迁移说明/描述': ec.migrationNote || ec.description
      }));
      const wsEntities = XLSX.utils.json_to_sheet(entityRows);
      XLSX.utils.book_append_sheet(wb, wsEntities, "实体映射表");

      // 2. 字段映射明细表 (Flat)
      const fieldRows: any[] = [];
      report.entityComparisons.forEach(ec => {
        (ec.attributeGaps || []).forEach(gap => {
          fieldRows.push({
            '所属实体': ec.sourceEntityName,
            '功能模块': gap.module || '—',
            '旧系统属性': gap.attributeName,
            '属性含义': gap.attributeMeaning,
            '数据类型(旧)': gap.sourceType,
            '新系统属性': gap.targetAttributeName || '—',
            '数据类型(新)': gap.targetType || '—',
            '映射规则/计算逻辑': gap.rule,
            '差异类型': gap.type,
            '备注': gap.remark || ''
          });
        });
      });
      const wsFields = XLSX.utils.json_to_sheet(fieldRows);
      XLSX.utils.book_append_sheet(wb, wsFields, "字段映射明细表");

      // 3. 枚举值对照表
      const enumRows = (report.enumComparisons || []).map(e => ({
        '关联属性名': e.attrName,
        '旧值 (Source)': e.sourceVal,
        '旧值含义': e.sourceMeaning,
        '新值 (Target)': e.targetVal,
        '新值含义': e.targetMeaning,
        '转换处理逻辑': e.logic
      }));
      const wsEnums = XLSX.utils.json_to_sheet(enumRows);
      XLSX.utils.book_append_sheet(wb, wsEnums, "枚举值对照表");

      // 生成文件名并导出
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `对标分析报告_${report.sourceProjectName}_至_${report.targetProjectName}_${timestamp}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Export failed", err);
      alert("Excel 导出失败，请检查控制台错误信息。");
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'matched': return 'text-green-600 bg-green-50 border-green-100';
      case 'missing_in_target': return 'text-red-600 bg-red-50 border-red-100';
      case 'extra_in_source': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'conflict': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-slate-400 bg-slate-50 border-slate-100';
    }
  };

  const getGapTypeColor = (type: string) => {
    switch (type) {
      case 'consistent': return 'bg-green-50 text-green-700';
      case 'conflict': return 'bg-red-50 text-red-700';
      case 'missing': return 'bg-amber-50 text-amber-700';
      case 'redundant': return 'bg-blue-50 text-blue-700';
      default: return 'bg-slate-50 text-slate-700';
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50">
      <div className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-8">
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">源系统 (发送方/旧系统)</label>
            <select value={sourceId} onChange={e => setSourceId(e.target.value)} className="w-full bg-slate-50 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold">
              <option value="">选择项目...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <ArrowRight className="text-slate-300 w-6 h-6 mt-6" />
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">目标系统 (接收方/新系统)</label>
            <select value={targetId} onChange={e => setTargetId(e.target.value)} className="w-full bg-slate-50 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold">
              <option value="">选择项目...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="pt-6">
            <button onClick={handleStartAnalysis} disabled={!sourceId || !targetId || sourceId === targetId} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-black px-8 py-3 rounded-2xl shadow-xl transition-all">
              <GitCompare className="w-5 h-5" /> 开启智能对标分析
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        <div className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-widest flex items-center gap-2"><History size={14} /> 对标历史</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            {(gapTasks || []).map(t => (
              <div key={t.id} onClick={() => setActiveTaskId(t.id)} className={`p-4 rounded-2xl cursor-pointer transition-all border-2 ${activeTaskId === t.id ? 'bg-blue-50 border-blue-400' : 'border-transparent hover:bg-slate-50'}`}>
                <div className="text-[10px] font-black text-slate-300 mb-1">{new Date(t.createdAt).toLocaleString()}</div>
                <div className="font-bold text-xs truncate flex items-center gap-2">
                   {projects.find(p => p.id === t.sourceProjectId)?.name} <ChevronRight size={10}/> {projects.find(p => p.id === t.targetProjectId)?.name}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {t.status === 'Analyzing' ? <span className="text-[10px] text-blue-500 animate-pulse font-black">分析中...</span> : <span className={`text-[10px] font-black ${t.status === 'Completed' ? 'text-green-500' : 'text-red-500'}`}>{t.status === 'Completed' ? '已就绪' : '失败'}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/30">
          {!activeTask ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-300">
               <BarChart3 className="w-16 h-16 opacity-10 mb-4" />
               <p className="font-black text-sm uppercase tracking-widest">请在上方选择对标项目或从左侧加载历史任务</p>
            </div>
          ) : activeTask.status === 'Analyzing' ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <p className="mt-4 font-black text-slate-800 uppercase tracking-widest text-xs">AI 正在深度扫描两个系统的架构差异并制定迁移规则...</p>
            </div>
          ) : activeTask.status === 'Failed' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-200 mb-4" />
              <h3 className="text-xl font-black text-slate-800">对标分析中断</h3>
              <p className="text-sm text-red-500 mt-2 bg-red-50 px-6 py-3 rounded-2xl border border-red-100">{activeTask.error}</p>
            </div>
          ) : !report ? (
             <div className="flex-1 flex items-center justify-center text-slate-400">报告数据缺失</div>
          ) : (
            <>
              <div className="bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between shrink-0">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setViewTab('entities')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black transition-all ${viewTab === 'entities' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>
                    <Table size={14} /> 实体映射表
                  </button>
                  <button onClick={() => setViewTab('fields')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black transition-all ${viewTab === 'fields' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>
                    <ListTree size={14} /> 字段映射明细表
                  </button>
                  <button onClick={() => setViewTab('enums')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black transition-all ${viewTab === 'enums' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>
                    <Hash size={14} /> 枚举值对照表
                  </button>
                </div>
                <div className="flex items-center gap-6">
                   <div className="flex items-center gap-4 border-r border-slate-200 pr-6">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400"><CheckCircle2 size={12} className="text-green-500"/> 完全匹配: {report.summary?.consistentEntities ?? 0}</div>
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400"><AlertTriangle size={12} className="text-red-500"/> 存在冲突: {report.summary?.conflictEntities ?? 0}</div>
                   </div>
                   <button 
                    onClick={handleExportExcel}
                    disabled={isExporting}
                    className="flex items-center gap-2.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50"
                   >
                     {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                     导出为 Excel
                   </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-8 scrollbar-thin">
                {viewTab === 'entities' && (
                  <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm animate-in fade-in duration-300">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">旧系统实体名 (Source)</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">新系统实体名 (Target)</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">对应关系</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">状态标识</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">迁移/对标说明</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {report.entityComparisons.map(ec => (
                          <tr key={ec.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-black text-slate-700 text-sm">{ec.sourceEntityName}</td>
                            <td className="px-6 py-4 font-bold text-slate-500 text-sm">{ec.targetEntityName || '—'}</td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-black">{ec.relationshipType}</span>
                            </td>
                            <td className="px-6 py-4">
                               <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-tighter ${getStatusColor(ec.status)}`}>
                                 {ec.status === 'matched' && <CheckCircle size={10}/>}
                                 {ec.status === 'missing_in_target' && <AlertCircle size={10}/>}
                                 {ec.status === 'extra_in_source' && <Info size={10}/>}
                                 {ec.status === 'conflict' && <XCircle size={10}/>}
                                 {ec.status}
                               </div>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500 font-medium max-w-md">{ec.migrationNote || ec.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {viewTab === 'fields' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    {report.entityComparisons.map(ec => (
                      <div key={ec.id} className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                        <div className="bg-slate-50/50 px-8 py-4 border-b border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Table size={16} className="text-blue-500" />
                            <span className="font-black text-slate-800">{ec.sourceEntityName}</span>
                            <ChevronRight size={14} className="text-slate-300" />
                            <span className="font-bold text-slate-500">{ec.targetEntityName || '未匹配'}</span>
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full shadow-inner">{(ec.attributeGaps || []).length} 个属性字段</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                              <tr className="bg-slate-50/30 border-b border-slate-100">
                                <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">模块</th>
                                <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">旧系统属性</th>
                                <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">属性含义</th>
                                <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">数据类型</th>
                                <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">新系统属性</th>
                                <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">映射规则/逻辑</th>
                                <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">状态</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {(ec.attributeGaps || []).map(gap => (
                                <tr key={gap.id} className="hover:bg-slate-50/30 transition-colors">
                                  <td className="px-6 py-4 text-[10px] font-bold text-slate-400">{gap.module || '—'}</td>
                                  <td className="px-6 py-4 font-black text-slate-700 text-sm">{gap.attributeName}</td>
                                  <td className="px-6 py-4 text-xs text-slate-500 font-medium">{gap.attributeMeaning}</td>
                                  <td className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">{gap.sourceType}</td>
                                  <td className="px-6 py-4 font-bold text-blue-600 text-sm">{gap.targetAttributeName || '—'}</td>
                                  <td className="px-6 py-4">
                                     <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px] font-medium text-slate-600 min-w-[200px] leading-relaxed">
                                       {gap.rule || '直接映射'}
                                     </div>
                                  </td>
                                  <td className="px-6 py-4">
                                     <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getGapTypeColor(gap.type)}`}>{gap.type}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {viewTab === 'enums' && (
                  <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm animate-in fade-in duration-300">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">关联属性名</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">旧值 (Source Value)</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">旧值含义</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">新值 (Target Value)</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">新值含义</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">值处理逻辑</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {(report.enumComparisons || []).map(enumGap => (
                          <tr key={enumGap.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-black text-slate-700 text-sm">{enumGap.attrName}</td>
                            <td className="px-6 py-4 font-mono text-xs text-blue-600 bg-blue-50/50">{enumGap.sourceVal}</td>
                            <td className="px-6 py-4 text-xs text-slate-600 font-medium">{enumGap.sourceMeaning}</td>
                            <td className="px-6 py-4 font-mono text-xs text-green-600 bg-green-50/50">{enumGap.targetVal}</td>
                            <td className="px-6 py-4 text-xs text-slate-600 font-medium">{enumGap.targetMeaning}</td>
                            <td className="px-6 py-4 text-xs font-bold text-amber-600 italic">{enumGap.logic}</td>
                          </tr>
                        ))}
                        {(report.enumComparisons || []).length === 0 && (
                          <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-300 font-black uppercase tracking-widest">当前分析未发现显著的枚举值转换逻辑</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmModal isOpen={confirmDeleteId !== null} onClose={() => setConfirmDeleteId(null)} onConfirm={() => { if(confirmDeleteId) onDeleteTask(confirmDeleteId); if(activeTaskId === confirmDeleteId) setActiveTaskId(null); }} title="确认移除分析报告？" message="此操作将永久移除该条对标分析报告。" />
    </div>
  );
};

export default GapAnalysis;
