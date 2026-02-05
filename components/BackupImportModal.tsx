import React, { useState } from 'react';
import { apiService } from '../services/apiService';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';

interface BackupImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BackupImportModal: React.FC<BackupImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/json' || selectedFile.name.endsWith('.json')) {
        setFile(selectedFile);
        setError('');
        setResult(null);
      } else {
        setError('请选择 JSON 格式的备份文件');
        setFile(null);
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('请先选择文件');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const fileContent = await file.text();
      const backupData = JSON.parse(fileContent);

      if (!backupData.projects || !Array.isArray(backupData.projects)) {
        throw new Error('无效的备份文件格式');
      }

      const response = await apiService.importBackup(backupData);
      
      setResult({
        imported: response.imported,
        skipped: response.skipped
      });

      // 延迟关闭，让用户看到结果
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('导入失败:', err);
      setError(err.message || '导入失败，请检查文件格式');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFile(null);
      setError('');
      setResult(null);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Upload style={{ width: '20px', height: '20px', color: '#2563eb' }} />
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>导入备份数据</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: '#9ca3af',
              padding: '4px',
              opacity: loading ? 0.5 : 1
            }}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              选择备份文件 (JSON)
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              disabled={loading}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1
              }}
            />
            {file && (
              <p style={{
                marginTop: '8px',
                fontSize: '14px',
                color: '#6b7280'
              }}>
                已选择: {file.name}
              </p>
            )}
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <AlertCircle style={{ width: '20px', height: '20px', color: '#dc2626', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '14px', color: '#991b1b' }}>{error}</p>
            </div>
          )}

          {result && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '12px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <CheckCircle style={{ width: '20px', height: '20px', color: '#16a34a', flexShrink: 0 }} />
              <div style={{ fontSize: '14px', color: '#166534' }}>
                <p style={{ margin: 0, fontWeight: '500' }}>导入成功！</p>
                <p style={{ margin: '4px 0 0 0' }}>
                  成功导入 {result.imported} 个项目
                  {result.skipped > 0 && `，跳过 ${result.skipped} 个已存在的项目`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '20px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <button
            onClick={handleClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={!file || loading}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: !file || loading ? '#d1d5db' : '#2563eb',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: !file || loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              if (file && !loading) e.currentTarget.style.backgroundColor = '#1d4ed8';
            }}
            onMouseLeave={(e) => {
              if (file && !loading) e.currentTarget.style.backgroundColor = '#2563eb';
            }}
          >
            {loading ? '导入中...' : '开始导入'}
          </button>
        </div>
      </div>
    </div>
  );
};
