/**
 * 模型列表组件
 * 显示特定类型的模型列表
 */

import React, { useState, useEffect } from 'react';
import { Plus, Check } from 'lucide-react';
import { 
  ModelType, 
  ModelDefinition, 
  ChatModelDefinition, 
  ImageModelDefinition, 
  VideoModelDefinition 
} from '../../types/model';
import {
  getModels,
  getActiveModelsConfig,
  setActiveModel,
  updateModel,
  registerModel,
  removeModel,
} from '../../services/modelRegistry';
import ModelCard from './ModelCard';
import AddModelForm from './AddModelForm';

interface ModelListProps {
  type: ModelType;
  onRefresh: () => void;
}

const typeLabels: Record<ModelType, string> = {
  chat: '对话模型',
  image: '图片模型',
  video: '视频模型',
};

const typeDescriptions: Record<ModelType, string> = {
  chat: '用于剧本解析、分镜生成、提示词优化等文本生成任务',
  image: '用于角色定妆、场景生成、关键帧生成等图片生成任务',
  video: '用于视频片段生成任务',
};

const ModelList: React.FC<ModelListProps> = ({ type, onRefresh }) => {
  const [models, setModels] = useState<ModelDefinition[]>([]);
  const [activeModelId, setActiveModelId] = useState<string>('');
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, [type]);

  const loadModels = () => {
    const allModels = getModels(type);
    const activeModels = getActiveModelsConfig();
    setModels(allModels);
    setActiveModelId(activeModels[type]);
  };

  const handleSetActive = (modelId: string) => {
    if (setActiveModel(type, modelId)) {
      setActiveModelId(modelId);
      onRefresh();
    }
  };

  const handleUpdateModel = (modelId: string, updates: Partial<ModelDefinition>) => {
    if (updateModel(modelId, updates)) {
      loadModels();
      onRefresh();
    }
  };

  const handleDeleteModel = (modelId: string) => {
    if (confirm('确定要删除这个模型吗？')) {
      if (removeModel(modelId)) {
        loadModels();
        onRefresh();
      }
    }
  };

  const handleAddModel = (model: Omit<ModelDefinition, 'id' | 'isBuiltIn'>) => {
    registerModel(model);
    setIsAddingModel(false);
    loadModels();
    onRefresh();
  };

  const handleToggleExpand = (modelId: string) => {
    setExpandedModelId(expandedModelId === modelId ? null : modelId);
  };

  return (
    <div className="space-y-4">
      {/* 类型说明 */}
      <div className="mb-4">
        <p className="text-xs text-zinc-400">{typeDescriptions[type]}</p>
        <p className="text-[10px] text-zinc-600 mt-1">
          提示：点击展开按钮可为每个模型配置专属 API Key
        </p>
      </div>

      {/* 当前激活模型指示 */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3 flex items-center gap-2">
        <Check className="w-4 h-4 text-indigo-400" />
        <span className="text-xs text-zinc-300">
          当前使用：
          <span className="text-white font-medium ml-1">
            {models.find(m => m.id === activeModelId)?.name || '未设置'}
          </span>
        </span>
      </div>

      {/* 模型列表 */}
      <div className="space-y-2">
        {models.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            isActive={model.id === activeModelId}
            isExpanded={expandedModelId === model.id}
            onSetActive={() => handleSetActive(model.id)}
            onToggleExpand={() => handleToggleExpand(model.id)}
            onUpdate={(updates) => handleUpdateModel(model.id, updates)}
            onDelete={() => handleDeleteModel(model.id)}
          />
        ))}
      </div>

      {/* 添加模型 */}
      {isAddingModel ? (
        <AddModelForm
          type={type}
          onSave={handleAddModel}
          onCancel={() => setIsAddingModel(false)}
        />
      ) : (
        <button
          onClick={() => setIsAddingModel(true)}
          className="w-full py-3 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          添加自定义模型
        </button>
      )}
    </div>
  );
};

export default ModelList;
