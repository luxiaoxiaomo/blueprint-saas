
import React, { useState, useEffect } from 'react';
import { AnalysisTask } from '../types';
import { Loader2, Trash2, Clock, Hourglass, MessageSquare, ChevronRight, RefreshCw, CheckCircle2, AlertCircle, FileSearch, MessageCircle, ImageIcon, Sparkles } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface TaskCenterProps {
  tasks: AnalysisTask[];
  onUpdateTaskStatus: (id: string, status: AnalysisTask['status']) => void;
  onDeleteTask: (id: string) => void;
  onOpenChat: (taskId: string) => void;
  onOpenVisionImport?: (task: AnalysisTask) => void; // 新增：打开视觉识别结果
  onApplyResult: (task: any) => void;
  onUndoApply: (task: AnalysisTask) => void;
}

const TaskCenter: React.FC<TaskCenterProps> = ({ 
  tasks, 
  onDeleteTask, 
  onOpenChat,
  onOpenVisionImport
}) => {
  const [, setTick] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatusLabel = (task: AnalysisTask) => {
    switch (task.status) {
      case 'Analyzing':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 animate-pulse">
            <RefreshCw size={10} className="animate-spin" />
            AI 分析中
          </div>
        );
      case 'Synchronizing':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100">
            <Loader2 size={10} className="animate-spin" />
            蓝图注入中
          </div>
        );
      case 'Completed':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100">
            <CheckCircle2 size={10} />
            分析已就绪
          </div>
        );
      case 'Failed':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-100">
            <AlertCircle size={10} />
            分析中断
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full space-y-10">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">任务中心</h2>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-sm">所有后台运行的 AI 分析会话与历史记录</p>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-24 flex flex-col items-center justify-center text-center space-y-6">
            <div className="bg-slate-50 p-8 rounded-full text-slate-200">
              <Clock className="w-16 h-16" />
            </div>
            <p className="text-xl font-black text-slate-400 uppercase tracking-widest leading-relaxed">
              暂无分析任务记录<br/>
              <span className="text-sm font-medium opacity-60">点击左下角“AI 智能梳理”开启分析</span>
            </p>
          </div>
        ) : (
          <div className="grid gap-6 pb-24">
            {tasks.sort((a, b) => b.createdAt - a.createdAt).map(task => {
              const lastMsg = task.messages[task.messages.length - 1];
              const isAnalyzing = task.status === 'Analyzing';
              const isProcessing = isAnalyzing || task.status === 'Synchronizing';
              const isFailed = task.status === 'Failed';
              const isVisionTask = task.taskType === 'VisionImport';
              
              let previewText = lastMsg?.content;
              if (isAnalyzing && (!previewText || previewText.trim() === '')) {
                previewText = isVisionTask ? 'AI 正在对您提供的界面截图进行多模态高阶架构识别，请稍后...' : 'AI 正在对您提供的业务需求进行高阶架构分析，请保持会话开启...';
              } else if (isFailed && (!previewText || previewText.trim() === '')) {
                previewText = '由于 API 请求异常或模型过载，分析未能成功执行，请检查网络后重试。';
              } else if (!previewText || previewText.trim() === '') {
                previewText = isVisionTask ? '截图解析已完成，点击下方按钮进入工作台查看捕获的实体与模块。' : '已收到反馈，AI 已准备就绪，您可以继续上传文档或输入指令。';
              }

              return (
                <div 
                  key={task.id} 
                  className={`bg-white rounded-[2.5rem] shadow-sm border p-8 flex flex-col gap-6 transition-all group relative overflow-hidden ${
                    isProcessing ? 'border-blue-400 ring-8 ring-blue-50 ring-offset-0' : 
                    isFailed ? 'border-red-200' :
                    'border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-100'
                  }`}
                >
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 to-transparent pointer-events-none animate-scan-line" />
                  )}

                  <div className="flex items-center justify-between z-10 relative">
                    <div className="flex items-center gap-6">
                      <div className={`p-4 rounded-[1.8rem] transition-all flex items-center justify-center ${
                        isAnalyzing ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' :
                        task.status === 'Synchronizing' ? 'bg-amber-500 text-white shadow-xl shadow-amber-100' :
                        task.status === 'Completed' ? (isVisionTask ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white') :
                        'bg-red-50 text-red-500'
                      }`}>
                        {isAnalyzing ? <RefreshCw className="w-7 h-7 animate-spin" /> :
                         task.status === 'Synchronizing' ? <Loader2 className="w-7 h-7 animate-spin" /> :
                         isVisionTask ? <ImageIcon className="w-7 h-7" /> :
                         task.status === 'Completed' ? <MessageCircle className="w-7 h-7" /> :
                         <AlertCircle className="w-7 h-7" />}
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-black text-slate-800 tracking-tight">{task.name}</h3>
                          {getStatusLabel(task)}
                          {isVisionTask && <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter">视觉解析</span>}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                          <span>{new Date(task.createdAt).toLocaleDateString('zh-CN')} {new Date(task.createdAt).toLocaleTimeString()}</span>
                          <span className="opacity-30">•</span>
                          <span>{isVisionTask ? `${task.files.length} 张截图` : `${task.messages.length} 条对话会话`}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isVisionTask ? (
                         <button
                          onClick={() => onOpenVisionImport?.(task)}
                          disabled={task.status === 'Analyzing'}
                          className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-xs font-black transition-all shadow-sm active:scale-95 ${
                            task.status === 'Completed' ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <Sparkles size={16} />
                          {task.status === 'Completed' ? '查看并回填解析结果' : '正在解析图像...'}
                        </button>
                      ) : (
                        <button
                          onClick={() => onOpenChat(task.id)}
                          className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-xs font-black transition-all shadow-sm active:scale-95 ${
                            isAnalyzing ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white'
                          }`}
                        >
                          <MessageSquare size={16} />
                          {isAnalyzing ? '查看实时分析进度' : '进入会话分析'}
                        </button>
                      )}
                      
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(task.id); }}
                        className="p-3.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>

                  <div className={`p-6 rounded-[1.8rem] border relative group-hover:bg-slate-50 transition-colors z-10 ${
                    isAnalyzing ? 'border-blue-100 bg-blue-50/50' : 
                    isFailed ? 'border-red-50 bg-red-50/10' :
                    'bg-slate-50/60 border-slate-100'
                  }`}>
                     <div className="flex items-center gap-2 mb-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${isAnalyzing ? 'bg-blue-500 animate-pulse' : isFailed ? 'bg-red-400' : 'bg-slate-400'}`} />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          {isAnalyzing ? 'AI 正在分析您的业务逻辑' : isFailed ? '错误详情预览' : '最新分析摘要'}
                        </span>
                     </div>
                     <p className={`text-sm font-bold leading-relaxed line-clamp-2 ${isAnalyzing ? 'text-blue-700 font-black' : isFailed ? 'text-red-600' : 'text-slate-600'}`}>
                        {previewText}
                     </p>
                     <div className="absolute right-6 bottom-6 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                        <ChevronRight className="w-5 h-5 text-blue-400" />
                     </div>
                  </div>

                  {isProcessing && (
                    <div className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 w-full animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal 
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => { if(confirmDeleteId) onDeleteTask(confirmDeleteId); }}
        title="删除分析任务记录？"
        message="该操作将永久删除此 AI 会话及其所有中间分析过程。相关的蓝图资产如已同步则不受影响。"
      />

      <style>{`
        @keyframes shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
        @keyframes scan-line {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }
        .animate-scan-line {
          animation: scan-line 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default TaskCenter;
