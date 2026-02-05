/**
 * 成员管理组件
 * 用于管理组织成员、分配部门、更新角色等
 */

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Shield, Building2, Trash2, Search, Filter, X, Check, AlertCircle } from 'lucide-react';

interface Member {
  id: string;
  userId: string;
  user?: {
    email: string;
    name?: string;
  };
  organizationId: string;
  role: 'owner' | 'admin' | 'architect' | 'developer' | 'viewer';
  departmentId?: string;
  department?: {
    id: string;
    name: string;
  };
  status: 'active' | 'invited' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

interface Department {
  id: string;
  name: string;
  organizationId: string;
  parentId?: string;
  path: string;
  level: number;
}

interface MemberManagementProps {
  organizationId: string;
}

const ROLE_LABELS = {
  owner: '所有者',
  admin: '管理员',
  architect: '架构师',
  developer: '开发者',
  viewer: '查看者'
};

const ROLE_COLORS = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  architect: 'bg-green-100 text-green-700',
  developer: 'bg-yellow-100 text-yellow-700',
  viewer: 'bg-gray-100 text-gray-700'
};

const STATUS_LABELS = {
  active: '活跃',
  invited: '已邀请',
  suspended: '已暂停'
};

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  invited: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700'
};

export const MemberManagement: React.FC<MemberManagementProps> = ({ organizationId }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // 模态框状态
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  
  // 表单数据
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Member['role']>('developer');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedRole, setSelectedRole] = useState<Member['role']>('developer');
  const [removeReason, setRemoveReason] = useState('');

  useEffect(() => {
    loadMembers();
    loadDepartments();
  }, [organizationId]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/members', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setMembers(data.data);
      }
    } catch (error) {
      console.error('加载成员失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await fetch('/api/departments', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setDepartments(data.data);
      }
    } catch (error) {
      console.error('加载部门失败:', error);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail) return;
    
    try {
      const response = await fetch('/api/members/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          organizationId,
          email: inviteEmail,
          role: inviteRole
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('邀请已发送！');
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteRole('developer');
        loadMembers();
      } else {
        alert('邀请失败: ' + data.error);
      }
    } catch (error) {
      console.error('邀请成员失败:', error);
      alert('邀请失败');
    }
  };

  const handleAssignDepartment = async () => {
    if (!selectedMember || !selectedDepartmentId) return;
    
    try {
      const response = await fetch(`/api/members/${selectedMember.id}/assign-department`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ departmentId: selectedDepartmentId })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('部门分配成功！');
        setShowAssignModal(false);
        setSelectedMember(null);
        setSelectedDepartmentId('');
        loadMembers();
      } else {
        alert('分配失败: ' + data.error);
      }
    } catch (error) {
      console.error('分配部门失败:', error);
      alert('分配失败');
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedMember) return;
    
    try {
      const response = await fetch(`/api/members/${selectedMember.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ role: selectedRole })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('角色更新成功！');
        setShowRoleModal(false);
        setSelectedMember(null);
        loadMembers();
      } else {
        alert('更新失败: ' + data.error);
      }
    } catch (error) {
      console.error('更新角色失败:', error);
      alert('更新失败');
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;
    
    try {
      const response = await fetch(`/api/members/${selectedMember.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason: removeReason })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('成员已移除！');
        setShowRemoveModal(false);
        setSelectedMember(null);
        setRemoveReason('');
        loadMembers();
      } else {
        alert('移除失败: ' + data.error);
      }
    } catch (error) {
      console.error('移除成员失败:', error);
      alert('移除失败');
    }
  };

  // 筛选成员
  const filteredMembers = members.filter(member => {
    const matchesSearch = !searchTerm || 
      member.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.user?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    const matchesStatus = filterStatus === 'all' || member.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">加载成员数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-50 flex flex-col overflow-hidden">
      {/* 头部 */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Users className="w-7 h-7 text-blue-600" />
              成员管理
            </h1>
            <p className="text-sm text-slate-500 mt-1">管理组织成员、分配部门和角色</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg"
          >
            <UserPlus size={18} />
            邀请成员
          </button>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="搜索成员邮箱或姓名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
          </div>
          
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
          >
            <option value="all">所有角色</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
          >
            <option value="all">所有状态</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 成员列表 */}
      <div className="flex-1 overflow-auto p-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-wider">成员</th>
                <th className="text-left px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-wider">角色</th>
                <th className="text-left px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-wider">部门</th>
                <th className="text-left px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-wider">状态</th>
                <th className="text-left px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-wider">加入时间</th>
                <th className="text-right px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">
                          {member.user?.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{member.user?.name || '未设置'}</div>
                        <div className="text-sm text-slate-500">{member.user?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${ROLE_COLORS[member.role]}`}>
                      <Shield size={12} />
                      {ROLE_LABELS[member.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {member.department ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                        <Building2 size={14} />
                        {member.department.name}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">未分配</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[member.status]}`}>
                      {STATUS_LABELS[member.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(member.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setSelectedDepartmentId(member.departmentId || '');
                          setShowAssignModal(true);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="分配部门"
                      >
                        分配部门
                      </button>
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setSelectedRole(member.role);
                          setShowRoleModal(true);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-green-600 hover:bg-green-50 rounded-lg transition-all"
                        title="更改角色"
                      >
                        更改角色
                      </button>
                      {member.role !== 'owner' && (
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setShowRemoveModal(true);
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="移除成员"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredMembers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">没有找到匹配的成员</p>
            </div>
          )}
        </div>
      </div>

      {/* 邀请成员模态框 */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Mail className="text-blue-600" size={24} />
                邀请新成员
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">邮箱地址</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="member@example.com"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">角色</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Member['role'])}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                >
                  {Object.entries(ROLE_LABELS).filter(([key]) => key !== 'owner').map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleInviteMember}
                disabled={!inviteEmail}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                发送邀请
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分配部门模态框 */}
      {showAssignModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Building2 className="text-blue-600" size={24} />
                分配部门
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-slate-600">
                为 <span className="font-bold">{selectedMember.user?.email}</span> 分配部门
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">选择部门</label>
                <select
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                >
                  <option value="">未分配</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {'　'.repeat(dept.level)}{dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleAssignDepartment}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
              >
                确认分配
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 更改角色模态框 */}
      {showRoleModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Shield className="text-blue-600" size={24} />
                更改角色
              </h3>
              <button onClick={() => setShowRoleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-slate-600">
                为 <span className="font-bold">{selectedMember.user?.email}</span> 更改角色
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">选择角色</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as Member['role'])}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                >
                  {Object.entries(ROLE_LABELS).filter(([key]) => key !== 'owner').map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRoleModal(false)}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleUpdateRole}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
              >
                确认更改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 移除成员模态框 */}
      {showRemoveModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <AlertCircle className="text-red-600" size={24} />
                移除成员
              </h3>
              <button onClick={() => setShowRemoveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-800">
                确定要移除 <span className="font-bold">{selectedMember.user?.email}</span> 吗？此操作无法撤销。
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">移除原因（可选）</label>
                <textarea
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                  placeholder="请输入移除原因..."
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRemoveModal(false)}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleRemoveMember}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
              >
                确认移除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
