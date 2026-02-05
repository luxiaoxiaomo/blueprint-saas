
import React from 'react';
import { AIModelType, AIModelProfile, ProviderKeys } from '../types';
import { Cpu, Globe, Key, ShieldCheck, Zap, Server, MessageSquare, Sliders, Layout, Eye, EyeOff, Lock, AlertCircle } from 'lucide-react';

interface SystemSettingsProps {
  selectedModel: AIModelType;
  onModelSelect: (id: AIModelType) => void;
  aiModels: AIModelProfile[];
  apiKeys: ProviderKeys;
  onApiKeysChange: (keys: ProviderKeys) => void;
}

const SystemSettings: React.FC<SystemSettingsProps> = ({ 
  selectedModel, 
  onModelSelect, 
  aiModels,
  apiKeys,
  onApiKeysChange
}) => {
  const [showKeys, setShowKeys] = React.useState<Record<string, boolean>>({});

  const toggleShow = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleKeyChange = (provider: keyof ProviderKeys, val: string) => {
    onApiKeysChange({ ...apiKeys, [provider]: val });
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-10 pb-20">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">系统配置</h2>
          <p className="text-slate-500 font-medium">定制您的 AI 引擎接入方式与核心参数</p>
        </div>

        {/* AI 引擎配置 */}
        <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-100">
              <Cpu className="text-white w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">AI 分析模型引擎</h3>
              <p className="text-sm text-slate-400">选择当前系统梳理所使用的模型后端版本</p>
            </div>
          </div>
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiModels.map((m) => (
              <button
                key={m.id}
                onClick={() => onModelSelect(m.id)}
                className={`flex items-start gap-4 p-5 rounded-[2rem] border-2 text-left transition-all ${
                  selectedModel === m.id 
                  ? 'border-blue-500 bg-blue-50/50 ring-4 ring-blue-50' 
                  : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${m.color} ${selectedModel === m.id ? 'animate-pulse' : ''}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-slate-800">{m.label}</span>
                    {selectedModel === m.id && <span className="bg-blue-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full">当前启用</span>}
                  </div>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    供应商: <span className="text-slate-600 font-bold">{m.provider}</span><br/>
                    {m.id.includes('gpt') || m.id.includes('gemini') ? '具备极强的结构化推理与代码分析能力' : '响应迅速，适合常规功能梳理'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 模型接入凭证 */}
        <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-8">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-3 rounded-2xl">
              <Key className="text-white w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">模型接入凭证 (API Keys)</h3>
              <p className="text-sm text-slate-400">配置第三方模型的访问密钥，凭证仅存储于您的浏览器本地</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">OpenAI API Key</label>
              <div className="relative">
                <input 
                  type={showKeys.openai ? "text" : "password"}
                  value={apiKeys.openai || ''}
                  onChange={(e) => handleKeyChange('openai', e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-slate-50 border-slate-100 rounded-2xl px-5 py-4 text-sm font-mono focus:ring-2 focus:ring-blue-100 transition-all pr-12"
                />
                <button onClick={() => toggleShow('openai')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                  {showKeys.openai ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DeepSeek API Key</label>
              <div className="relative">
                <input 
                  type={showKeys.deepseek ? "text" : "password"}
                  value={apiKeys.deepseek || ''}
                  onChange={(e) => handleKeyChange('deepseek', e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-slate-50 border-slate-100 rounded-2xl px-5 py-4 text-sm font-mono focus:ring-2 focus:ring-blue-100 transition-all pr-12"
                />
                <button onClick={() => toggleShow('deepseek')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                  {showKeys.deepseek ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* 豆包专用配置�?*/}
            <div className="md:col-span-2 p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100 space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-xl"><Zap className="text-white w-4 h-4" /></div>
                <span className="text-sm font-black text-slate-800">豆包 (Doubao) 接入配置</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">火山引擎 API Key</label>
                  <div className="relative">
                    <input 
                      type={showKeys.doubao ? "text" : "password"}
                      value={apiKeys.doubao || ''}
                      onChange={(e) => handleKeyChange('doubao', e.target.value)}
                      placeholder="填入您截图右侧的 API Key"
                      className="w-full bg-white border-blue-100 rounded-2xl px-5 py-4 text-sm font-mono focus:ring-2 focus:ring-blue-200 transition-all pr-12"
                    />
                    <button onClick={() => toggleShow('doubao')} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 hover:text-blue-500">
                      {showKeys.doubao ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <Link2 size={10} /> 推理接入�?ID (Endpoint ID)
                  </label>
                  <input 
                    type="text"
                    value={apiKeys.doubaoEndpoint || ''}
                    onChange={(e) => handleKeyChange('doubaoEndpoint', e.target.value)}
                    placeholder="ep-2025..."
                    className="w-full bg-white border-blue-100 rounded-2xl px-5 py-4 text-sm font-mono focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                  <p className="text-[9px] text-blue-400 font-bold px-1">在火山方舟“推理接入点”页面获取，格式通常�?ep-xxx</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">通义千问 API Key</label>
              <div className="relative">
                <input 
                  type={showKeys.aliyun ? "text" : "password"}
                  value={apiKeys.aliyun || ''}
                  onChange={(e) => handleKeyChange('aliyun', e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-slate-50 border-slate-100 rounded-2xl px-5 py-4 text-sm font-mono focus:ring-2 focus:ring-blue-100 transition-all pr-12"
                />
                <button onClick={() => toggleShow('aliyun')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                  {showKeys.aliyun ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SystemSettings;

