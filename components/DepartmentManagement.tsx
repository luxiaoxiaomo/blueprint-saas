/**
 * 部门管理组件
 * 用于管理组织的部门树形结构
 */

import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Users, ChevronRight, ChevronDown, X, AlertCircle } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  parentId?: string;
  path: string;
  level: number;
  sortOrder: number;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
  children?: Department[];
}

interface DepartmentManagementProps {
  organizationId: string;
}

export const DepartmentManagement: React.FC<DepartmentManagementProps> = ({ organizationId }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  
  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: ''
  });

  useEffect(() => {
    loadDepartments();
  }, [organizationId]);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/departments', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setDepartments(buildTree(data.data));
      }
    } catch (error) {
      console.error('加载部门失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 构建树形结构
  const buildTree = (flatList: Department[]): Department[] => {
    const map = new Map<string, Department>();
    const roots: Department[] = [];

    // 创建映射
    flatList.forEach(dept => {
      map.set(dept.id, { ...dept, children: [] });
    });

    // 构建树
    flatList.forEach(dept => {
      const node = map.get(dept.id)!;
      if (dept.parentId) {
        const parent = map.get(dept.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    // 排序
    const sortChildren = (nodes: Department[]) => {
      nodes.sort((a, b) => a.sortOrder - b.sortOrder);
      nodes.forEach(node => {
        if (node.children) sortChildren(node.children);
      });
    };
    sortChildren(roots);

    return roots;
  };

  // 获取扁平列表（用于选择父部门）
  const getFlatList = (tree: Department[], level = 0): Department[] => {
    let result: Department[] = [];
    tree.forEach(dept => {
      result.push({ ...dept, level });
      if (dept.children) {
        result = result.concat(getFlatList(dept.children, level + 1));
      }
    });
    return result;
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleCreate = async () => {
    if (!formData.name) return;

    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          parentId: formData.parentId || null
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('部门创建成功！');
        setShowCreateModal(false);
        setFormData({ name: '', description: '', parentId: '' });
        loadDepartments();
      } else {
        alert('创建失败: ' + data.error);
      }
    } catch (error) {
      console.error('创建部门失败:', error);
      alert('创建失败');
    }
  };

  const handleUpdate = async () => {
    if (!selectedDepartment || !formData.name) return;

    try {
      const response = await fetch(`/api/departments/${selectedDepartment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('部门更新成功！');
        setShowEditModal(false);
        setSelectedDepartment(null);
        setFormData({ name: '', description: '', parentId: '' });
        loadDepartments();
      } else {
        alert('更新失败: ' + data.error);
      }
    } catch (error) {
      console.error('更新部门失败:', error);
      alert('更新失败');
    }
  };

  const handleDelete = async () => {
    if (!selectedDepartment) return;

    try {
      const response = await fetch(`/api/departments/${selectedDepartment.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        alert('部门删除成功！');
        setShowDeleteModal(false);
        setSelectedDepartment(null);
        loadDepartments();
      } else {
        alert('删除失败: ' + data.error);
      }
    } catch (error) {
      console.error('删除部门失败:', error);
      alert('删除失败');
    }
  };

  const renderDepartmentTree = (depts: Department[], level = 0) => {
    return depts.map(dept => {
      const isExpanded = expandedIds.has(dept.id);
      const hasChildren = dept.children && dept.children.length > 0;

      return (
        <div key={dept.id}>
          <div
            className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-xl transition-all group ${
              level > 0 ? 'ml-' + (level * 6) : ''
            }`}
            style={{ marginLeft: `${level * 24}px` }}
          >
            {/* 展开/折叠按钮 */}
            <button
              onClick={() => toggleExpand(dept.id)}
              className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-all ${
                !hasChildren ? 'invisible' : ''
              }`}
            >
              {isExpanded ? (
                <ChevronDown size={16} className="text-slate-600" />
              ) : (
                <ChevronRight size={16} className="text-slate-600" />
              )}
            </button>

            {/* 部门图标 */}
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Building2 size={20} className="text-blue-600" />
            </div>

            {/* 部门信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 truncate">{dept.name}</h3>
                {dept.memberCount !== undefined && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Users size={12} />
                    {dept.memberCount}
                  </span>
                )}
              </div>
              {dept.description && (
                <p className="text-sm text-slate-500 truncate">{dept.description}</p>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => {
                  setSelectedParentId(dept.id);
                  setFormData({ name: '', description: '', parentId: dept.id });
                  setShowCreateModal(true);
                }}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                title="添加子部门"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={() => {
                  setSelectedDepartment(dept);
                  setFormData({
                    name: dept.name,
                    description: dept.description || '',
                    parentId: dept.parentId || ''
                  });
                  setShowEditModal(true);
                }}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                title="编辑部门"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => {
                  setSelectedDepartment(dept);
                  setShowDeleteModal(true);
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="删除部门"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* 子部门 */}
          {isExpanded && hasChildren && (
            <div className="mt-1">
              {renderDepartmentTree(dept.children!, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">加载部门数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-50 flex flex-col overflow-hidden">
      {/* 头部 */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Building2 className="w-7 h-7 text-blue-600" />
              部门管理
            </h1>
            <p className="text-sm text-slate-500 mt-1">管理组织的部门树形结构</p>
          </div>
          <button
            onClick={() => {
              setFormData({ name: '', description: '', parentId: '' });
              setSelectedParentId('');
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg"
          >
            <Plus size={18} />
            创建部门
          </button>
        </div>
      </div>

      {/* 部门树 */}
      <div className="flex-1 overflow-auto p-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {departments.length > 0 ? (
            <div className="space-y-2">
              {renderDepartmentTree(departments)}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">还没有创建任何部门</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all"
              >
                <Plus size={18} />
                创建第一个部门
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 创建部门模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Plus className="text-blue-600" size={24} />
                创建部门
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">部门名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：技术部"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">部门描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="部门职责和说明..."
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">上级部门</label>
                <select
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                >
                  <option value="">无（顶级部门）</option>
                  {getFlatList(departments).map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {'　'.repeat(dept.level)}{dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!formData.name}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                创建部门
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑部门模态框 */}
      {showEditModal && selectedDepartment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Edit2 className="text-blue-600" size={24} />
                编辑部门
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">部门名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：技术部"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">部门描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="部门职责和说明..."
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleUpdate}
                disabled={!formData.name}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                保存更改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除部门模态框 */}
      {showDeleteModal && selectedDepartment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <AlertCircle className="text-red-600" size={24} />
                删除部门
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-800">
                确定要删除部门 <span className="font-bold">{selectedDepartment.name}</span> 吗？
              </p>
              <p className="text-sm text-red-600 mt-2">
                此操作无法撤销。如果部门下有成员，需要先转移成员。
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
