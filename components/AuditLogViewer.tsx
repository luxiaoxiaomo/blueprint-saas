import React, { useState, useEffect } from 'react';
import { X, Clock, User, Activity, Filter, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { apiService } from '../services/apiService';

interface AuditLog {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface AuditLogStats {
  total: number;
  byAction: Record<string, number>;
  byResourceType: Record<string, number>;
}

interface AuditLogViewerProps {
  onClose: () => void;
}

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  // 筛选条件
  const [filterAction, setFilterAction] = useState('');
  const [filterResourceType, setFilterResourceType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [filterAction, filterResourceType]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterAction) params.append('action', filterAction);
      if (filterResourceType) params.append('resourceType', filterResourceType);
      
      const response = await fetch(`/api/audit-logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/audit-logs/stats/summary', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load audit stats:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionColor = (action: string) => {
    if (action.includes('Create')) return 'text-green-600 bg-green-50';
    if (action.includes('Update')) return 'text-blue-600 bg-blue-50';
    if (action.includes('Delete')) return 'text-red-600 bg-red-50';
    if (action.includes('Archive')) return 'text-amber-600 bg-amber-50';
    if (action.includes('FAILED')) return 'text-red-700 bg-red-100';
    return 'text-slate-600 bg-slate-50';
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'CreateProject': '创建项目',
      'UpdateProject': '更新项目',
      'DeleteProject': '删除项目',
      'ArchiveProject': '归档项目',
      'CreateModule': '创建模块',
      'UpdateModule': '更新模块',
      'DeleteModule': '删除模块',
    };
    return labels[action] || action;
  };

  const filteredLogs = logs.filter(log => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.action.toLowerCase().includes(query) ||
        log.resourceType.toLowerCase().includes(query) ||
        log.resourceId?.toLowerCase().includes(query) ||
        log.userName?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-black text-slate-800">审计日志</h2>
            <p className="text-sm text-slate-500 mt-1">查看系统操作记录</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* 统计信息 */}
        {stats && (
          <div className="p-6 border-b border-slate-200 bg-slate-50">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="text-sm text-slate-500 mb-1">总操作数</div>
                <div className="text-2xl font-black text-slate-800">{stats.total}</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="text-sm text-slate-500 mb-1">操作类型</div>
                <div className="text-2xl font-black text-slate-800">
                  {Object.keys(stats.byAction).length}
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="text-sm text-slate-500 mb-1">资源类型</div>
                <div className="text-2xl font-black text-slate-800">
                  {Object.keys(stats.byResourceType).length}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 筛选和搜索 */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索操作、资源或用户..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              筛选
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">操作类型</label>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全部</option>
                  {stats && Object.keys(stats.byAction).map(action => (
                    <option key={action} value={action}>{getActionLabel(action)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">资源类型</label>
                <select
                  value={filterResourceType}
                  onChange={(e) => setFilterResourceType(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全部</option>
                  {stats && Object.keys(stats.byResourceType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* 日志列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-blue-600"></div>
              <p className="mt-4 text-slate-500">加载中...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">暂无审计日志</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getActionColor(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                        <span className="text-sm text-slate-600">
                          {log.resourceType}
                          {log.resourceId && ` #${log.resourceId.substring(0, 8)}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.userName || log.userEmail || log.userId}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(log.createdAt)}
                        </div>
                        {log.ipAddress && (
                          <div className="flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            {log.ipAddress}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 详情弹窗 */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-800">操作详情</h3>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <div className="text-sm font-bold text-slate-700 mb-1">操作类型</div>
                  <div className="text-slate-900">{getActionLabel(selectedLog.action)}</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-700 mb-1">资源类型</div>
                  <div className="text-slate-900">{selectedLog.resourceType}</div>
                </div>
                {selectedLog.resourceId && (
                  <div>
                    <div className="text-sm font-bold text-slate-700 mb-1">资源ID</div>
                    <div className="text-slate-900 font-mono text-sm">{selectedLog.resourceId}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold text-slate-700 mb-1">操作时间</div>
                  <div className="text-slate-900">{formatDate(selectedLog.createdAt)}</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-700 mb-1">操作用户</div>
                  <div className="text-slate-900">{selectedLog.userName || selectedLog.userEmail}</div>
                </div>
                {selectedLog.ipAddress && (
                  <div>
                    <div className="text-sm font-bold text-slate-700 mb-1">IP地址</div>
                    <div className="text-slate-900">{selectedLog.ipAddress}</div>
                  </div>
                )}
                {selectedLog.details && (
                  <div>
                    <div className="text-sm font-bold text-slate-700 mb-1">详细信息</div>
                    <pre className="bg-slate-50 p-4 rounded-xl text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogViewer;
