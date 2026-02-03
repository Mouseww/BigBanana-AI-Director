/**
 * 添加模型表单组件
 */

import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { 
  ModelType, 
  ModelDefinition,
  ChatModelParams,
  ImageModelParams,
  VideoModelParams,
  DEFAULT_CHAT_PARAMS,
  DEFAULT_IMAGE_PARAMS,
  DEFAULT_VIDEO_PARAMS_SORA,
  DEFAULT_VIDEO_PARAMS_VEO,
} from '../../types/model';
import { getProviders } from '../../services/modelRegistry';

interface AddModelFormProps {
  type: ModelType;
  onSave: (model: Omit<ModelDefinition, 'id' | 'isBuiltIn'>) => void;
  onCancel: () => void;
}

const AddModelForm: React.FC<AddModelFormProps> = ({ type, onSave, onCancel }) => {
  const providers = getProviders();
  
  const [name, setName] = useState('');
  const [modelId, setModelId] = useState('');
  const [description, setDescription] = useState('');
  const [providerId, setProviderId] = useState(providers[0]?.id || 'antsk');
  const [endpoint, setEndpoint] = useState('');
  const [videoMode, setVideoMode] = useState<'sync' | 'async'>('sync');

  const handleSave = () => {
    if (!name.trim() || !modelId.trim()) {
      alert('请填写模型名称和模型 ID');
      return;
    }

    let params: ChatModelParams | ImageModelParams | VideoModelParams;
    
    if (type === 'chat') {
      params = { ...DEFAULT_CHAT_PARAMS };
    } else if (type === 'image') {
      params = { ...DEFAULT_IMAGE_PARAMS };
    } else {
      params = videoMode === 'async' 
        ? { ...DEFAULT_VIDEO_PARAMS_SORA }
        : { ...DEFAULT_VIDEO_PARAMS_VEO };
    }

    const model: Omit<ModelDefinition, 'id' | 'isBuiltIn'> = {
      name: name.trim(),
      type,
      providerId,
      endpoint: endpoint.trim() || undefined,
      description: description.trim() || undefined,
      isEnabled: true,
      params,
    } as any;

    // 使用用户输入的 ID 覆盖（在 registerModel 之前）
    (model as any).id = modelId.trim();

    onSave(model);
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-4 space-y-4">
      <h4 className="text-sm font-bold text-white">添加自定义模型</h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-zinc-500 block mb-1">模型名称 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：GPT-4 Turbo"
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-xs text-white placeholder:text-zinc-600"
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 block mb-1">模型 ID *</label>
          <input
            type="text"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            placeholder="如：gpt-4-turbo"
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-xs text-white placeholder:text-zinc-600 font-mono"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-zinc-500 block mb-1">描述</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="可选的描述信息"
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-xs text-white placeholder:text-zinc-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-zinc-500 block mb-1">提供商</label>
          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-xs text-white"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 block mb-1">API 端点（可选）</label>
          <input
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="使用默认端点"
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-xs text-white placeholder:text-zinc-600 font-mono"
          />
        </div>
      </div>

      {type === 'video' && (
        <div>
          <label className="text-[10px] text-zinc-500 block mb-1">API 模式</label>
          <div className="flex gap-2">
            <button
              onClick={() => setVideoMode('sync')}
              className={`flex-1 py-2 text-xs rounded transition-colors ${
                videoMode === 'sync'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              同步模式（Veo 类）
            </button>
            <button
              onClick={() => setVideoMode('async')}
              className={`flex-1 py-2 text-xs rounded transition-colors ${
                videoMode === 'async'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              异步模式（Sora 类）
            </button>
          </div>
          <p className="text-[9px] text-zinc-600 mt-1">
            同步模式：使用 /v1/chat/completions 端点；异步模式：使用 /v1/videos 端点
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          className="flex-1 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-500 transition-colors flex items-center justify-center gap-1"
        >
          <Check className="w-3 h-3" />
          添加模型
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 bg-zinc-800 text-zinc-400 text-xs rounded hover:bg-zinc-700 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default AddModelForm;
