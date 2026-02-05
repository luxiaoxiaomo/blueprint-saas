import React, { useState } from 'react';
import { apiService } from '../services/apiService';

interface ImportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportDataModal: React.FC<ImportDataModalProps> = ({ isOpen, onClose, onSuccess }) => {
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
        padding: '30px',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>导入备份数据</h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '10px',
            fontWeight: 'bold'
          }}>
            选择备份文件 (JSON)
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
          {file && (
            <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
              已选择: {file.name}
            </div>
          )}
        </div>

        {error && (
          <div style={{
            padding: '10px',
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{
            padding: '10px',
            backgroundColor: '#efe',
            color: '#3c3',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            ✓ 成功导入 {result.imported} 个项目
            {result.skipped > 0 && `，跳过 ${result.skipped} 个已存在的项目`}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleClose}
            disabled={loading}
            style={{
              padding: '10px 20px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={!file || loading}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: !file || loading ? '#ccc' : '#007bff',
              color: 'white',
              cursor: !file || loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '导入中...' : '开始导入'}
          </button>
        </div>
      </div>
    </div>
  );
};
