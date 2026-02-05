
import React, { useState } from 'react';
import { ViewMode } from '../types';
import { LayoutGrid, Database, Share2, ListTodo, ChevronLeft, ChevronRight, Briefcase, Sparkles, Network, GitCompare, Settings, FileUp, Users, Building2 } from 'lucide-react';

interface SidebarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onUploadClick: () => void;
  onImportClick: () => void;
  activeTasksCount: number;
}

const Sidebar: React.FC<SidebarProps> = ({ viewMode, setViewMode, onUploadClick, onImportClick, activeTasksCount }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { id: 'projects' as ViewMode, label: '项目管理', icon: Briefcase },
    { id: 'modules' as ViewMode, label: '功能模块', icon: LayoutGrid },
    { id: 'entities' as ViewMode, label: '实体与属性', icon: Database },
    { id: 'graph' as ViewMode, label: '实体关联图', icon: Share2 },
    { id: 'function-graph' as ViewMode, label: '功能引用图', icon: Network },
    { id: 'gap-analysis' as ViewMode, label: '对接差异分析', icon: GitCompare },
    { id: 'tasks' as ViewMode, label: '任务中心', icon: ListTodo, badge: activeTasksCount },
    { id: 'members' as ViewMode, label: '成员管理', icon: Users },
    { id: 'departments' as ViewMode, label: '部门管理', icon: Building2 },
  ];

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} h-full bg-white border-r border-slate-200 flex flex-col transition-all duration-300 relative shrink-0`}>
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-1 shadow-sm hover:bg-slate-50 z-20 text-slate-400 hover:text-blue-600 transition-colors"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <div className={`p-6 border-b border-slate-100 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="bg-blue-600 p-2 rounded-lg flex-shrink-0">
          <GitCompare className="text-white w-6 h-6" />
        </div>
        {!isCollapsed && <h1 className="font-bold text-xl text-slate-800 tracking-tight whitespace-nowrap overflow-hidden">蓝图 AI</h1>}
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-x-hidden">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setViewMode(item.id)}
            title={isCollapsed ? item.label : undefined}
            className={`w-full flex items-center rounded-xl transition-all h-12 ${
              isCollapsed ? 'justify-center' : 'px-4 justify-between'
            } ${
              viewMode === item.id
                ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </div>
            {!isCollapsed && item.badge && item.badge > 0 && (
              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 space-y-2 border-t border-slate-100">
        <button
          onClick={onImportClick}
          className={`w-full flex items-center rounded-xl transition-all h-12 ${
            isCollapsed ? 'justify-center' : 'px-4'
          } text-slate-500 hover:bg-slate-50 hover:text-blue-600`}
        >
          <FileUp className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="ml-3 font-bold">批量导入数据</span>}
        </button>
        
        <button
          onClick={() => setViewMode('settings')}
          className={`w-full flex items-center rounded-xl transition-all h-12 ${
            isCollapsed ? 'justify-center' : 'px-4'
          } ${
            viewMode === 'settings'
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="ml-3">系统配置</span>}
        </button>
        
        <button
          onClick={onUploadClick}
          className={`w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-100 active:scale-[0.98] ${
            isCollapsed ? 'h-12' : 'px-4 py-4'
          }`}
        >
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">AI 智能梳理</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
