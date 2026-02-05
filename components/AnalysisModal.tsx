
import React, { useState } from 'react';
import { X, Upload, FileCheck, Layers, MinusSquare } from 'lucide-react';
import { AnalysisTask } from '../types';

interface AnalysisModalProps {
  onClose: () => void;
  onTaskCreate: (task: AnalysisTask) => void;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ onClose, onTaskCreate }) => {
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; base64: string }[]>([]);
  const [isReading, setIsReading] = useState(false);

  // Added explicit types to resolve 'unknown' and '{}' issues in the file processing pipeline
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setIsReading(true);
      const filesArray = Array.from(e.target.files) as File[];
      const newFiles = await Promise.all(
        filesArray.map((file: File) => new Promise<{ file: File; base64: string }>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ file, base64: reader.result as string });
          reader.readAsDataURL(file);
        }))
      );
      setSelectedFiles(prev => [...prev, ...newFiles]);
      setIsReading(false);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartAnalysis = () => {
    if (selectedFiles.length === 0) return;

    // Fix: Added 'messages' property to satisfy the AnalysisTask interface
    const newTask: AnalysisTask = {
      id: crypto.randomUUID(),
      name: `分析任务 - ${new Date().toLocaleTimeString()}`,
      status: 'Analyzing',
      messages: [],
      files: selectedFiles.map(f => ({ name: f.file.name, type: f.file.type, data: f.base64 })),
      createdAt: Date.now()
    };

    onTaskCreate(newTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Layers className="text-blue-600 w-6 h-6" />
            <h2 className="text-xl font-bold text-slate-800">创建新分析任务</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-blue-400 transition-colors group relative">
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
              accept="image/*,.pdf,.csv"
            />
            <div className="bg-slate-50 p-4 rounded-full group-hover:bg-blue-50 transition-colors">
              <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">点击或拖拽多个文件上传</p>
              <p className="text-sm text-slate-500 mt-1">AI 将同时分析选中的所有文件，构建全局系统蓝图</p>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">待处理文件 ({selectedFiles.length})</h3>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <FileCheck className="w-5 h-5 text-blue-500" />
                      <span className="text-sm font-medium text-slate-700 truncate max-w-xs">{f.file.name}</span>
                    </div>
                    <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleStartAnalysis}
              disabled={selectedFiles.length === 0 || isReading}
              className={`flex-1 px-4 py-3 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                selectedFiles.length === 0 || isReading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200'
              }`}
            >
              <Layers className="w-5 h-5" />
              创建并后台运行
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
