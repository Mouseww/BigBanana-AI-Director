/**
 * 图片模型适配器
 * 处理 Gemini Image API
 */

import { ImageModelDefinition, ImageGenerateOptions, AspectRatio } from '../../types/model';
import { getApiKeyForModel, getApiBaseUrlForModel, getActiveImageModel } from '../modelRegistry';
import { ApiKeyError } from './chatAdapter';

/**
 * 从Markdown文本中提取首个图片URL
 */
const extractMarkdownImageUrl = (text: string): string | null => {
  const match = text.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/);
  return match ? match[1] : null;
};

/**
 * 下载图片URL并转为Base64 Data URL
 */
const fetchImageBlob = async (url: string): Promise<Blob> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`图片下载失败: HTTP ${response.status}`);
    }
    return await response.blob();
  } catch (error) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      const proxyUrl = `${window.location.origin}/image-proxy?url=${encodeURIComponent(url)}`;
      const proxyResponse = await fetch(proxyUrl);
      if (!proxyResponse.ok) {
        throw error;
      }
      return await proxyResponse.blob();
    }
    throw error;
  }
};

const convertImageUrlToBase64 = async (url: string): Promise<string> => {
  const blob = await fetchImageBlob(url);
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('图片转Base64失败'));
    reader.readAsDataURL(blob);
  });
};

/**
 * 解析SSE流式图片响应（等待STOP后判定）
 */
const parseSseImageResponse = async (response: Response): Promise<string> => {
  if (!response.body) {
    throw new Error('图片生成失败：响应体为空');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let collectedText = '';
  let inlineDataUrl: string | null = null;
  let stopReceived = false;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';

    for (const chunk of chunks) {
      const lines = chunk.split(/\r?\n/);
      const dataLines = lines.filter(line => line.startsWith('data:'));
      if (dataLines.length === 0) continue;

      const data = dataLines.map(line => line.replace(/^data:\s?/, '')).join('\n').trim();
      if (!data) continue;
      if (data === '[DONE]') {
        stopReceived = true;
        continue;
      }

      try {
        const payload = JSON.parse(data);
        const candidates = payload.candidates || [];
        for (const candidate of candidates) {
          if (candidate.finishReason === 'STOP') {
            stopReceived = true;
          }

          const parts = candidate.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data && !inlineDataUrl) {
              inlineDataUrl = `data:image/png;base64,${part.inlineData.data}`;
            }
            if (typeof part.text === 'string') {
              collectedText += part.text;
            }
          }
        }
      } catch {
        // 忽略非JSON数据块
      }
    }
  }

  if (inlineDataUrl) {
    return inlineDataUrl;
  }

  if (!stopReceived) {
    // 未收到STOP但流已结束，按最终内容判定
  }

  const imageUrl = extractMarkdownImageUrl(collectedText);
  if (imageUrl) {
    return convertImageUrlToBase64(imageUrl);
  }

  throw new Error('图片生成失败：未能从SSE响应中提取图片数据');
};

/**
 * 重试操作
 */
const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 2000
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      // 400/401/403 错误不重试
      if (error.message?.includes('400') || 
          error.message?.includes('401') || 
          error.message?.includes('403')) {
        throw error;
      }
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
};

/**
 * 调用图片生成 API
 */
export const callImageApi = async (
  options: ImageGenerateOptions,
  model?: ImageModelDefinition
): Promise<string> => {
  // 获取当前激活的模型
  const activeModel = model || getActiveImageModel();
  if (!activeModel) {
    throw new Error('没有可用的图片模型');
  }

  // 获取 API 配置
  const apiKey = getApiKeyForModel(activeModel.id);
  if (!apiKey) {
    throw new ApiKeyError('API Key 缺失，请在设置中配置 API Key');
  }
  
  const apiBase = getApiBaseUrlForModel(activeModel.id);
  const endpoint = activeModel.endpoint || `/v1beta/models/${activeModel.id}:generateContent`;
  
  // 确定宽高比
  const aspectRatio = options.aspectRatio || activeModel.params.defaultAspectRatio;
  
  // 构建提示词
  let finalPrompt = options.prompt;
  
  // 如果有参考图，添加一致性指令
  if (options.referenceImages && options.referenceImages.length > 0) {
    finalPrompt = `
      ⚠️⚠️⚠️ CRITICAL REQUIREMENTS - CHARACTER CONSISTENCY ⚠️⚠️⚠️
      
      Reference Images Information:
      - The FIRST image is the Scene/Environment reference.
      - Any subsequent images are Character references (Base Look or Variation).
      
      Task:
      Generate a cinematic shot matching this prompt: "${options.prompt}".
      
      ⚠️ ABSOLUTE REQUIREMENTS (NON-NEGOTIABLE):
      1. Scene Consistency:
         - STRICTLY maintain the visual style, lighting, and environment from the scene reference.
      
      2. Character Consistency - HIGHEST PRIORITY:
         If characters are present in the prompt, they MUST be IDENTICAL to the character reference images:
         • Facial Features: Eyes (color, shape, size), nose structure, mouth shape, facial contours must be EXACTLY the same
         • Hairstyle & Hair Color: Length, color, texture, and style must be PERFECTLY matched
         • Clothing & Outfit: Style, color, material, and accessories must be IDENTICAL
         • Body Type: Height, build, proportions must remain consistent
         
      ⚠️ DO NOT create variations or interpretations of the character - STRICT REPLICATION ONLY!
      ⚠️ Character appearance consistency is THE MOST IMPORTANT requirement!
    `;
  }

  // 构建请求 parts
  const parts: any[] = [{ text: finalPrompt }];

  // 添加参考图片
  if (options.referenceImages) {
    options.referenceImages.forEach((imgUrl) => {
      const match = imgUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    });
  }

  // 构建请求体
  const requestBody: any = {
    contents: [{
      role: 'user',
      parts: parts,
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  };
  
  // 非默认宽高比需要添加 imageConfig
  if (aspectRatio !== '16:9') {
    requestBody.generationConfig.imageConfig = {
      aspectRatio: aspectRatio,
    };
  }

  // 调用 API
  const response = await retryOperation(async () => {
    const res = await fetch(`${apiBase}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': '*/*',
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      if (res.status === 400) {
        throw new Error('提示词可能包含不安全或违规内容，未能处理。请修改后重试。');
      }
      if (res.status === 500) {
        throw new Error('当前请求较多，暂时未能处理成功，请稍后重试。');
      }
      
      let errorMessage = `HTTP 错误: ${res.status}`;
      try {
        const errorData = await res.json();
        errorMessage = errorData.error?.message || errorMessage;
      } catch (e) {
        const errorText = await res.text();
        if (errorText) errorMessage = errorText;
      }
      throw new Error(errorMessage);
    }

    return res;
  });

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream')) {
    return parseSseImageResponse(response);
  }

  let responseData: any;
  try {
    responseData = await response.json();
  } catch (error) {
    throw new Error('图片生成失败：响应不是有效的JSON');
  }

  // 提取 base64 图片（inlineData 优先）
  const candidates = responseData.candidates || [];
  if (candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
    let collectedText = '';
    for (const part of candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
      if (typeof part.text === 'string') {
        collectedText += part.text;
      }
    }

    const imageUrl = extractMarkdownImageUrl(collectedText);
    if (imageUrl) {
      return convertImageUrlToBase64(imageUrl);
    }
  }

  throw new Error('图片生成失败：未能从响应中提取图片数据');
};

/**
 * 检查宽高比是否支持
 */
export const isAspectRatioSupported = (
  aspectRatio: AspectRatio,
  model?: ImageModelDefinition
): boolean => {
  const activeModel = model || getActiveImageModel();
  if (!activeModel) return false;
  
  return activeModel.params.supportedAspectRatios.includes(aspectRatio);
};
