/**
 * 模型卡片组件
 * 显示单个模型的配置
 */

import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { 
  ModelDefinition, 
  ChatModelDefinition, 
  ImageModelDefinition, 
  VideoModelDefinition,
  ChatModelParams,
  ImageModelParams,
  VideoModelParams,
  AspectRatio,
  VideoDuration
} from '../../types/model';

interface ModelCardProps {
  model: ModelDefinition;
  isActive: boolean;
  isExpanded: boolean;
  onSetActive: () => void;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<ModelDefinition>) => void;
  onDelete: () => void;
}

const ModelCard: React.FC<ModelCardProps> = ({
  model,
  isActive,
  isExpanded,
  onSetActive,
  onToggleExpand,
  onUpdate,
  onDelete,
}) => {
  const [editParams, setEditParams] = useState<any>(model.params);

  const handleParamChange = (key: string, value: any) => {
    const newParams = { ...editParams, [key]: value };
    setEditParams(newParams);
    onUpdate({ params: newParams } as any);
  };

  const handleToggleEnabled = () => {
    onUpdate({ isEnabled: !model.isEnabled });
  };

  const renderChatParams = (params: ChatModelParams) => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-[10px] text-zinc-500 block mb-1">温度</label>
        <input
          type="number"
          min="0"
          max="2"
          step="0.1"
          value={editParams.temperature}
          onChange={(e) => handleParamChange('temperature', parseFloat(e.target.value))}
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-xs text-white"
        />
      </div>
      <div>
        <label className="text-[10px] text-zinc-500 block mb-1">最大 Token</label>
        <input
          type="number"
          min="1"
          max="128000"
          value={editParams.maxTokens}
          onChange={(e) => handleParamChange('maxTokens', parseInt(e.target.value))}
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-xs text-white"
        />
      </div>
    </div>
  );

  const renderImageParams = (params: ImageModelParams) => (
    <div>
      <label className="text-[10px] text-zinc-500 block mb-1">默认比例</label>
      <div className="flex gap-2">
        {(['16:9', '9:16', '1:1'] as AspectRatio[]).map((ratio) => (
          <button
            key={ratio}
            onClick={() => handleParamChange('defaultAspectRatio', ratio)}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${
              editParams.defaultAspectRatio === ratio
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {ratio === '16:9' ? '横屏' : ratio === '9:16' ? '竖屏' : '方形'}
          </button>
        ))}
      </div>
    </div>
  );

  const renderVideoParams = (params: VideoModelParams) => (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] text-zinc-500 block mb-1">默认比例</label>
        <div className="flex gap-2">
          {editParams.supportedAspectRatios.map((ratio: AspectRatio) => (
            <button
              key={ratio}
              onClick={() => handleParamChange('defaultAspectRatio', ratio)}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                editParams.defaultAspectRatio === ratio
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {ratio === '16:9' ? '横屏' : ratio === '9:16' ? '竖屏' : '方形'}
            </button>
          ))}
        </div>
      </div>
      {editParams.supportedDurations.length > 1 && (
        <div>
          <label className="text-[10px] text-zinc-500 block mb-1">默认时长</label>
          <div className="flex gap-2">
            {editParams.supportedDurations.map((duration: VideoDuration) => (
              <button
                key={duration}
                onClick={() => handleParamChange('defaultDuration', duration)}
                className={`px-3 py-1.5 text-xs rounded transition-colors ${
                  editParams.defaultDuration === duration
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {duration}秒
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="text-[10px] text-zinc-600">
        模式：{editParams.mode === 'sync' ? '同步（Veo）' : '异步（Sora）'}
      </div>
    </div>
  );

  return (
    <div 
      className={`bg-zinc-900/50 border rounded-lg overflow-hidden transition-all ${
        isActive ? 'border-indigo-500/50' : 'border-zinc-800'
      } ${!model.isEnabled ? 'opacity-60' : ''}`}
    >
      {/* 头部 */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          {/* 激活选择 */}
          <button
            onClick={onSetActive}
            disabled={!model.isEnabled}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              isActive 
                ? 'bg-indigo-500 border-indigo-500' 
                : 'border-zinc-600 hover:border-zinc-400'
            } ${!model.isEnabled ? 'cursor-not-allowed' : ''}`}
          >
            {isActive && <Check className="w-3 h-3 text-white" />}
          </button>
          
          {/* 模型信息 */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">{model.name}</span>
              {model.isBuiltIn && (
                <span className="px-1.5 py-0.5 bg-zinc-700 text-zinc-400 text-[9px] rounded">内置</span>
              )}
              {isActive && (
                <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[9px] rounded">当前</span>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              ID: {model.id}
              {model.description && ` · ${model.description}`}
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 启用/禁用开关 */}
          <button
            onClick={handleToggleEnabled}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            title={model.isEnabled ? '禁用' : '启用'}
          >
            {model.isEnabled ? (
              <ToggleRight className="w-5 h-5 text-indigo-400" />
            ) : (
              <ToggleLeft className="w-5 h-5" />
            )}
          </button>

          {/* 删除按钮（仅非内置模型） */}
          {!model.isBuiltIn && (
            <button
              onClick={onDelete}
              className="text-zinc-500 hover:text-red-400 transition-colors"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* 展开/收起 */}
          <button
            onClick={onToggleExpand}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* 展开的参数配置 */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-zinc-800">
          <div className="pt-4 space-y-4">
            {model.type === 'chat' && renderChatParams(model.params)}
            {model.type === 'image' && renderImageParams(model.params)}
            {model.type === 'video' && renderVideoParams(model.params)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelCard;
