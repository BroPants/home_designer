import { useState, useEffect } from 'react';
import { X, Key, Check, AlertCircle } from 'lucide-react';
import { settingsApi } from '@/services/api';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'api' | 'general'>('api');

  // 加载已保存的 API Key
  useEffect(() => {
    if (isOpen) {
      loadApiKey();
    }
  }, [isOpen]);

  const loadApiKey = async () => {
    try {
      const key = await settingsApi.getApiKey();
      if (key) {
        // 只显示前 8 位和后 4 位
        setApiKey(maskApiKey(key));
      } else {
        setApiKey('');
      }
    } catch (err) {
      console.error('Failed to load API key:', err);
    }
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 12) return key;
    return `${key.slice(0, 8)}...${key.slice(-4)}`;
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: '请输入 API Key' });
      return;
    }

    // 如果输入的是掩码格式，说明没有修改
    if (apiKey.includes('...')) {
      setMessage({ type: 'success', text: 'API Key 未更改' });
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 1000);
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await settingsApi.setApiKey(apiKey.trim());
      setMessage({ type: 'success', text: 'API Key 保存成功' });
      setApiKey(maskApiKey(apiKey.trim()));
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 1000);
    } catch (err) {
      setMessage({ type: 'error', text: '保存失败，请重试' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    setIsLoading(true);
    try {
      await settingsApi.setApiKey('');
      setApiKey('');
      setMessage({ type: 'success', text: 'API Key 已清除' });
    } catch (err) {
      setMessage({ type: 'error', text: '清除失败' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">设置</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 标签页 */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('api')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'api'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            API 设置
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'general'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            通用设置
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {activeTab === 'api' ? (
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-xl">
                <Key className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Moonshot API Key</p>
                  <p className="text-blue-600/80">
                    请输入您的 Moonshot AI API Key 以使用 AI 设计功能。
                    <a
                      href="https://platform.moonshot.cn/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-800 ml-1"
                    >
                      获取 API Key →
                    </a>
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  您的 API Key 将安全地存储在本地数据库中
                </p>
              </div>

              {message && (
                <div
                  className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}
                >
                  {message.type === 'success' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? '保存中...' : '保存'}
                </button>
                {apiKey && (
                  <button
                    onClick={handleClear}
                    disabled={isLoading}
                    className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    清除
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>通用设置功能开发中...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
