import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Image as ImageIcon, AlertCircle, Copy, Check, Trash2 } from 'lucide-react';
import { Message } from '@/types';
import { formatTimestamp } from '@/utils/format';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string, imageIds?: string[]) => void;
  isLoading: boolean;
  error?: string | null;
  onClearMessages?: () => void;
}

export function ChatInterface({ 
  messages, 
  onSendMessage, 
  isLoading, 
  error,
  onClearMessages 
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // 自动调整 textarea 高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 头部 */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          <span className="text-xs text-gray-500">
            共 {messages.length} 条消息
          </span>
          {onClearMessages && (
            <button
              onClick={onClearMessages}
              className="flex items-center space-x-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清空对话</span>
            </button>
          )}
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">开始设计您的家</h3>
              <p className="text-sm text-gray-500 mt-1">
                描述您的设计需求，AI 将为您生成专业的室内设计方案
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {samplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSendMessage(prompt)}
                  className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageItem 
              key={message.id} 
              message={message} 
              isLatest={index === messages.length - 1 && message.role === 'assistant'}
            />
          ))
        )}
        {isLoading && (
          <div className="flex items-center space-x-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">AI 正在思考...</span>
          </div>
        )}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 text-red-800 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="描述您的设计需求..."
              className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[44px] max-h-[120px] text-sm"
              rows={1}
              disabled={isLoading}
            />
            <div className="absolute right-2 bottom-2 text-xs text-gray-400">
              {input.length > 0 && `${input.length} 字`}
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className={`
              px-4 py-2.5 rounded-xl font-medium text-sm
              transition-all duration-200
              ${
                input.trim() && !isLoading
                  ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          按 Enter 发送，Shift + Enter 换行
        </p>
      </div>
    </div>
  );
}

// 消息项组件
function MessageItem({ message, isLatest }: { message: Message; isLatest?: boolean }) {
  const isUser = message.role === 'user';
  const [displayContent, setDisplayContent] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // 打字机效果（仅对最新的 AI 消息）
  useEffect(() => {
    if (isLatest && !isUser && message.content.length > 0) {
      const content = message.content;
      let index = 0;
      setDisplayContent('');
      
      const timer = setInterval(() => {
        if (index < content.length) {
          setDisplayContent(content.slice(0, index + 1));
          index++;
        } else {
          clearInterval(timer);
        }
      }, 15); // 每 15ms 显示一个字符

      return () => clearInterval(timer);
    } else {
      setDisplayContent(message.content);
    }
  }, [message.content, isLatest, isUser]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [message.content]);

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="relative group max-w-[80%]">
        <div
          className={`
            rounded-2xl px-4 py-3
            ${
              isUser
                ? 'bg-primary-600 text-white rounded-br-md'
                : 'bg-gray-100 text-gray-800 rounded-bl-md'
            }
          `}
        >
          {/* 显示引用的图片 */}
          {message.images && message.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {message.images.map((_, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-1 text-xs ${
                    isUser ? 'text-primary-200' : 'text-gray-500'
                  }`}
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>图片 {index + 1}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {displayContent}
            {isLatest && !isUser && displayContent.length < message.content.length && (
              <span className="inline-block w-2 h-4 ml-0.5 bg-gray-400 animate-pulse" />
            )}
          </p>
          <div
            className={`text-xs mt-1.5 ${
              isUser ? 'text-primary-200' : 'text-gray-400'
            }`}
          >
            {formatTimestamp(message.timestamp)}
          </div>
        </div>

        {/* 操作按钮 */}
        {!isUser && (
          <button
            onClick={handleCopy}
            className={`
              absolute -right-8 top-0 p-1.5 rounded-lg transition-all
              ${showActions || copied
                ? 'opacity-100 text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                : 'opacity-0'
              }
            `}
            title={copied ? '已复制' : '复制内容'}
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// 示例提示
const samplePrompts = [
  '我想要现代简约风格的客厅',
  '帮我设计一个温馨的卧室',
  '小户型如何最大化利用空间？',
  '北欧风格的餐厅设计建议',
];
