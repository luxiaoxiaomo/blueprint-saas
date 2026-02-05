
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { SystemModel, ChatMessage, GapReport, AIModelType, ProviderKeys } from "../types";

const getSavedKeys = (): ProviderKeys => {
  try {
    const saved = localStorage.getItem('blueprint_api_keys');
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
};

const PROVIDER_CONFIGS: Record<string, { baseUrl: string; headerKey: string; getModel: (m: string) => string }> = {
  'OpenAI': { 
    baseUrl: 'https://api.openai.com/v1/chat/completions', 
    headerKey: 'Authorization',
    getModel: (m) => m 
  },
  'DeepSeek': { 
    baseUrl: 'https://api.deepseek.com/chat/completions', 
    headerKey: 'Authorization',
    getModel: (m) => m === 'deepseek-chat' ? 'deepseek-chat' : 'deepseek-coder'
  },
  'ByteDance': { 
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', 
    headerKey: 'Authorization',
    getModel: (m) => m 
  },
  'Alibaba': {
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    headerKey: 'Authorization',
    getModel: (m) => m
  }
};

const getModelProvider = (modelName: AIModelType) => {
  if (modelName.startsWith('gemini')) return 'Google';
  if (modelName.startsWith('gpt')) return 'OpenAI';
  if (modelName.startsWith('deepseek')) return 'DeepSeek';
  if (modelName === 'doubao-pro') return 'ByteDance';
  if (modelName === 'qwen-max') return 'Alibaba';
  return 'Unknown';
};

async function fetchOpenAICompatible(
  messages: any[], 
  modelName: AIModelType, 
  config: { systemInstruction: string; responseFormat?: any }
) {
  const provider = getModelProvider(modelName);
  const cfg = PROVIDER_CONFIGS[provider];
  const keys = getSavedKeys();
  
  const providerToKeyMap: Record<string, keyof ProviderKeys> = {
    'OpenAI': 'openai',
    'DeepSeek': 'deepseek',
    'ByteDance': 'doubao',
    'Alibaba': 'aliyun'
  };

  const keyName = providerToKeyMap[provider];
  const apiKey = keyName ? (keys as any)[keyName] : null;

  if (!apiKey && provider !== 'Google') {
    throw new Error(`请先在系统设置中配置 ${provider} 的 API Key`);
  }

  let targetModel = cfg.getModel(modelName);
  
  if (provider === 'ByteDance') {
    if (!keys.doubaoEndpoint) {
      throw new Error(`使用豆包模型需要配置“推理接入点 ID (Endpoint ID)”`);
    }
    targetModel = keys.doubaoEndpoint;
  }

  const response = await fetch(cfg.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [cfg.headerKey]: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: targetModel,
      messages: [
        { role: 'system', content: config.systemInstruction },
        ...messages
      ],
      ...(config.responseFormat ? { response_format: config.responseFormat } : {})
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `[${provider} API 错误] ${response.statusText}`);
  }

  return await response.json();
}

export const analyzeSystemImage = async (base64Images: string[], modelName: AIModelType = 'gemini-3-pro-preview'): Promise<SystemModel> => {
  const provider = getModelProvider(modelName);
  if (provider !== 'Google') {
    throw new Error("目前仅 Google Gemini 3 系列引擎支持视觉架构分析。");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `你是一位顶尖的【系统架构师】。请分析提供的系统截图，识别出其中蕴含的功能模块、具体的业务场景（功能点）以及核心数据实体及其属性。必须返回符合蓝图 Schema 的 JSON 数据，属性名和描述请使用中文。`;
  const parts = base64Images.map(img => ({ inlineData: { mimeType: "image/png", data: img.split(',')[1] } }));
  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts: [...parts, { text: prompt }] },
    config: { responseMimeType: "application/json", responseSchema: blueprintSchema as any }
  });
  if (!response.text) throw new Error("视觉解析失败");
  return JSON.parse(response.text.trim()) as SystemModel;
};

export const streamAnalysisChat = async (messages: ChatMessage[], onChunk: (text: string) => void, modelName: AIModelType = 'gemini-3-pro-preview') => {
  const provider = getModelProvider(modelName);
  const sysInst = `你是一位拥有15年经验的【资深首席架构师】。通过分析业务描述，梳理功能模块、业务场景、数据实体方案。使用中文。`;
  if (provider === 'Google') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContentStream({
      model: modelName,
      contents: messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
      config: { systemInstruction: sysInst }
    });
    let fullText = "";
    for await (const chunk of response) { if (chunk.text) { fullText += chunk.text; onChunk(fullText); } }
  } else {
    const result = await fetchOpenAICompatible(messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content })), modelName, { systemInstruction: sysInst });
    onChunk(result.choices[0].message.content);
  }
};

export const compareSystems = async (source: SystemModel, target: SystemModel, modelName: AIModelType = 'gemini-3-pro-preview'): Promise<GapReport> => {
  const provider = getModelProvider(modelName);
  const prompt = `你是一个【高阶系统架构对标分析专家】。
对比旧系统(Source)和新系统(Target)的蓝图。

[输出要求]:
1. 实体映射表：识别 Source 实体在 Target 中的对应，标明对应关系(匹配/一对多等)和迁移说明。
2. 字段映射明细：对比字段的语义、类型，定义映射规则(计算逻辑)。
3. 枚举对照表：解析 possibleValues，制定值转换逻辑。

[Source]: ${JSON.stringify(source)}
[Target]: ${JSON.stringify(target)}

必须返回纯 JSON，结构需符合 GapReport 定义。必须包含 summary 统计对象。`;

  if (provider === 'Google') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { 
        responseMimeType: "application/json",
        responseSchema: gapReportSchema as any
      }
    });
    return JSON.parse(response.text.trim()) as GapReport;
  } else {
    const result = await fetchOpenAICompatible(
      [{ role: 'user', content: prompt }],
      modelName,
      { systemInstruction: "你是一个专业的系统差异分析器，必须返回符合 JSON 格式的结构化对标报告，包含完整的 summary 统计对象。", responseFormat: { type: "json_object" } }
    );
    return JSON.parse(result.choices[0].message.content.trim()) as GapReport;
  }
};

export const extractBlueprintData = async (messages: ChatMessage[], modelName: AIModelType = 'gemini-3-pro-preview'): Promise<SystemModel> => {
  const provider = getModelProvider(modelName);
  const prompt = `提取全量蓝图 JSON。使用中文。`;
  if (provider === 'Google') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [...messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })), { role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json", responseSchema: blueprintSchema as any }
    });
    return JSON.parse(response.text.trim()) as SystemModel;
  } else {
    const result = await fetchOpenAICompatible([...messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content })), { role: 'user', content: prompt }], modelName, { systemInstruction: "仅返回 JSON。", responseFormat: { type: "json_object" } });
    return JSON.parse(result.choices[0].message.content.trim()) as SystemModel;
  }
};

const gapReportSchema = {
  type: Type.OBJECT,
  properties: {
    entityComparisons: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          sourceEntityName: { type: Type.STRING },
          targetEntityName: { type: Type.STRING },
          relationshipType: { type: Type.STRING },
          migrationNote: { type: Type.STRING },
          status: { type: Type.STRING },
          attributeGaps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                module: { type: Type.STRING },
                attributeName: { type: Type.STRING },
                attributeMeaning: { type: Type.STRING },
                sourceType: { type: Type.STRING },
                targetAttributeName: { type: Type.STRING },
                targetType: { type: Type.STRING },
                type: { type: Type.STRING },
                rule: { type: Type.STRING },
                remark: { type: Type.STRING }
              }
            }
          },
          description: { type: Type.STRING }
        }
      }
    },
    enumComparisons: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          attrName: { type: Type.STRING },
          sourceVal: { type: Type.STRING },
          sourceMeaning: { type: Type.STRING },
          targetVal: { type: Type.STRING },
          targetMeaning: { type: Type.STRING },
          logic: { type: Type.STRING }
        }
      }
    },
    summary: {
      type: Type.OBJECT,
      properties: {
        consistentEntities: { type: Type.NUMBER },
        conflictEntities: { type: Type.NUMBER },
        missingEntities: { type: Type.NUMBER },
        extraEntities: { type: Type.NUMBER },
        totalAttributeConflicts: { type: Type.NUMBER }
      },
      required: ["consistentEntities", "conflictEntities", "missingEntities", "extraEntities", "totalAttributeConflicts"]
    }
  },
  required: ["entityComparisons", "enumComparisons", "summary"]
};

const blueprintSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    modules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          functionalPoints: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                entityUsages: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { entityId: { type: Type.STRING }, usageType: { type: Type.STRING } } } }
              }
            }
          }
        }
      }
    },
    entities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          attributes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, type: { type: Type.STRING }, description: { type: Type.STRING }, possibleValues: { type: Type.STRING } } } }
        }
      }
    }
  }
};
