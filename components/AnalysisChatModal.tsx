
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Paperclip, Loader2, FileText, MinusSquare, Database, Sparkles, RefreshCw, Cpu, CheckCircle2, AlertCircle } from 'lucide-react';
import { ChatMessage, AnalysisTask, AIModelType, AIModelProfile } from '../types';
import { streamAnalysisChat, extractBlueprintData } from '../services/geminiService';

interface AnalysisChatModalProps {
  task: AnalysisTask;
  onClose: () => void;
  onMinimize: () => void;
  onUpdateTaskMessages: (taskId: string, messages: ChatMessage[]) => void;
  onUpdateTaskStatus: (taskId: string, status: AnalysisTask['status'], error?: string) => void;
  onApplyModel: (model: any) => void;
  onCreateTask: (initialMessages: ChatMessage[]) => string | null;
  selectedModel: AIModelType;
  currentProfile: AIModelProfile;
}

const AnalysisChatModal: React.FC<AnalysisChatModalProps> = ({ 
  task, 
  onClose, 
  onMinimize, 
  onUpdateTaskMessages, 
  onUpdateTaskStatus,
  onApplyModel,
  onCreateTask,
  selectedModel,
  currentProfile
}) => {
  const [inputValue, setInputValue] = useState('');
  const [attachments, setAttachments] = useState<{ file: File; data: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(task.messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDraft = task.id === 'draft';
  const currentTaskId = useRef<string>(task.id);

  // 状态判定：只有在 Analyzing 或 Synchronizing 时禁用输入
  const isBusy = task.status === 'Analyzing' || task.status === 'Synchronizing';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages, task.messages]);

  useEffect(() => {
    if (!isDraft) {
      setLocalMessages(task.messages);
      currentTaskId.current = task.id;
    }
  }, [task.messages, isDraft, task.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files) as File[];
      const newFiles = await Promise.all(
        filesArray.map((file: File) => new Promise<{ file: File; data: string }>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ file, data: reader.result as string });
          reader.readAsDataURL(file);
        }))
      );
      setAttachments(prev => [...prev, ...newFiles]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput && attachments.length === 0) return;
    if (isBusy) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedInput,
      timestamp: Date.now(),
      files: attachments.map(a => ({ name: a.file.name, type: a.file.type, data: a.data }))
    };

    let updatedMessages = [...localMessages, userMsg];
    let taskId = currentTaskId.current;

    if (isDraft) {
      const newId = onCreateTask(updatedMessages);
      if (!newId) return;
      taskId = newId;
      currentTaskId.current = newId;
    } else {
      onUpdateTaskMessages(taskId, updatedMessages);
    }
    
    setLocalMessages(updatedMessages);
    setInputValue('');
    setAttachments([]);
    setIsTyping(true);
    onUpdateTaskStatus(taskId, 'Analyzing');

    const modelMsgId = crypto.randomUUID();
    const initialModelMsg: ChatMessage = {
      id: modelMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now()
    };
    
    const messagesWithModelPlaceholder = [...updatedMessages, initialModelMsg];
    setLocalMessages(messagesWithModelPlaceholder);
    onUpdateTaskMessages(taskId, messagesWithModelPlaceholder);

    try {
      let receivedAnyChunk = false;
      await streamAnalysisChat(updatedMessages, (chunk) => {
        receivedAnyChunk = true;
        const withChunk = messagesWithModelPlaceholder.map(m => 
          m.id === modelMsgId ? { ...m, content: chunk } : m
        );
        setLocalMessages(withChunk);
        onUpdateTaskMessages(taskId, withChunk);
      }, selectedModel);

      if (!receivedAnyChunk) {
         throw new Error("AI 引擎未返回任何有效分析数据，请检查 API 配置或输入内容。");
      }
      
      onUpdateTaskStatus(taskId, 'Completed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '分析过程发生未知异常';
      const failed = messagesWithModelPlaceholder.map(m => 
        m.id === modelMsgId ? { ...m, content: `⚠️ 分析中断：${errorMessage}` } : m
      );
      setLocalMessages(failed);
      onUpdateTaskMessages(taskId, failed);
      onUpdateTaskStatus(taskId, 'Failed', errorMessage);
    } finally {
      setIsTyping(false);
    }
  };

  const handleGenerateBlueprint = async () => {
    if (isDraft) return;
    const taskId = currentTaskId.current;
    onUpdateTaskStatus(taskId, 'Synchronizing');
    try {
      const model = await extractBlueprintData(localMessages, selectedModel);
      onApplyModel(model);
      onUpdateTaskStatus(taskId, 'Completed');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "蓝图提取失败";
      onUpdateTaskStatus(taskId, 'Failed', msg);
      alert("蓝图同步失败：" + msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[3rem] shadow-[0_32px_128px_-32px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        <header className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-5">
            <div className={`p-3 rounded-2xl shadow-xl transition-all ${isBusy ? 'bg-blue-600 animate-pulse shadow-blue-200' : 'bg-slate-900'}`}>
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">{isDraft ? '新建 AI 梳理' : task.name}</h2>
                {task.status === 'Analyzing' && (
                  <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Loader2 size={10} className="animate-spin" /> 正在梳理中...
                  </span>
                )}
                {task.status === 'Completed' && (
                  <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 size={10} /> 分析就绪
                  </span>
                )}
                {task.status === 'Failed' && (
                  <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle size={10} /> 分析失败
                  </span>
                )}
              </div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                <Cpu size={12} className="text-blue-500" /> 分析引擎: {currentProfile.label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            {!isDraft && (
              <button
                onClick={handleGenerateBlueprint}
                disabled={isBusy}
                className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl text-xs font-black shadow-xl transition-all active:scale-95 disabled:opacity-50 ${
                  task.status === 'Synchronizing' ? 'bg-amber-500 text-white shadow-amber-100' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100'
                }`}
              >
                {task.status === 'Synchronizing' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                {task.status === 'Synchronizing' ? '数据注入中...' : '同步蓝图数据'}
              </button>
            )}
            <div className="flex items-center gap-3 border-l border-slate-100 pl-5">
              {!isDraft && (
                <button 
                  onClick={onMinimize} 
                  className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-300 hover:text-blue-600"
                >
                  <MinusSquare className="w-6 h-6" />
                </button>
              )}
              <button 
                onClick={onClose} 
                className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-300 hover:text-red-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-10 py-10 space-y-10 bg-slate-50/40 scrollbar-thin">
          {localMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-[2rem] p-8 shadow-sm ${
                msg.role === 'user' ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-white border border-slate-100 text-slate-700'
              }`}>
                {msg.files && msg.files.length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-6 bg-slate-900/5 p-6 rounded-3xl border border-slate-100">
                    {msg.files.map((f, i) => (
                      <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[11px] font-black tracking-tight ${
                        msg.role === 'user' ? 'bg-white/10 text-white border border-white/20' : 'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}>
                        <FileText className="w-4 h-4" />
                        {f.name}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="text-base leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</div>
                
                {msg.content === '' && msg.role === 'model' && task.status === 'Analyzing' && (
                  <div className="flex flex-col gap-4 mt-4">
                    <div className="flex items-center gap-3 text-blue-600 font-black text-sm p-6 bg-blue-50 rounded-[1.8rem] border border-blue-100 animate-pulse">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      AI 正在深度扫描业务文档并构建架构模型...
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                       <div className="bg-blue-500 h-full animate-progress-indefinite w-1/3" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isTyping && localMessages[localMessages.length-1]?.role === 'user' && !isBusy && (
             <div className="flex justify-start">
               <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm flex items-center gap-3 text-slate-400 font-black text-sm italic">
                 正在准备请求...
               </div>
             </div>
          )}
        </div>

        <div className="p-10 bg-white border-t border-slate-100 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-6 animate-in slide-in-from-bottom-4">
              {attachments.map((a, i) => (
                <div key={i} className="flex items-center gap-3 bg-blue-50 px-5 py-2.5 rounded-2xl border border-blue-100">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="text-[11px] font-black text-blue-700 truncate max-w-[160px]">{a.file.name}</span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-blue-300 hover:text-red-500 transition-colors p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-5">
            <label className="p-5 bg-slate-50 hover:bg-blue-50 rounded-[1.8rem] cursor-pointer transition-all text-slate-400 hover:text-blue-600 active:scale-95 border border-slate-100 flex-shrink-0">
              <input 
                ref={fileInputRef}
                type="file" 
                multiple 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <Paperclip className="w-7 h-7" />
            </label>
            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isBusy}
                placeholder={isBusy ? "AI 正在思考中，请稍候..." : "输入需求或指令，我将协助您梳理系统功能模块..."}
                className="w-full bg-slate-50 border border-slate-100 rounded-[1.8rem] px-8 py-5 text-base font-bold focus:ring-4 focus:ring-blue-100 min-h-[64px] max-h-48 resize-none transition-all placeholder:text-slate-300 disabled:opacity-50"
                rows={1}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={isBusy || (!inputValue.trim() && attachments.length === 0)}
              className="p-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.8rem] transition-all active:scale-90 shadow-2xl shadow-blue-100 disabled:opacity-30 disabled:bg-slate-300 flex-shrink-0"
              title="发送指令"
            >
              <Send className="w-7 h-7" />
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes progress-indefinite {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .animate-progress-indefinite {
          animation: progress-indefinite 2s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default AnalysisChatModal;
