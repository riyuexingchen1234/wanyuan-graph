import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from '../../schema.json';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

export interface CollectionTask {
  taskType: 'node' | 'context';
  target: {
    name: string;
    node_type: 'material' | 'process' | 'equipment' | 'product' | 'industry';
    coordinate_systems: ('A' | 'B')[];
  };
  context?: string;
}

export interface CollectionResult {
  task_id: string;
  status: 'success' | 'failed' | 'partial';
  collected_data?: {
    nodes?: any[];
    edges?: any[];
  };
  raw_response?: string;
  sources?: any[];
  review_notes?: string;
  created_at: string;
  error?: string;
}

interface LLMResponse {
  nodes?: any[];
  edges?: any[];
  review_notes?: string;
}

interface ParsedLLMResponse {
  nodes: any[];
  edges: any[];
  review_notes: string;
}

const SYSTEM_PROMPT = `你是产业数据整理助手。

请根据提供的主题，整理该事物的产业信息，包括：
1. 节点信息：名称、类型、坐标系（产业链A/材料属性B）、别名、属性、描述等
2. 连接信息：该事物与其他已知事物的关系

重要规则：
- 所有边的 verification_status 必须为 "proposed"，即使是看起来很明显的连接
- 严格按 JSON Schema 格式输出，不要输出任何其他内容
- 所有节点和边必须包含 created_at 和 updated_at 字段（ISO 8601 格式）
- 不要编造未经核实的信息，有疑问时在 review_notes 中说明`;

export async function collectNode(task: CollectionTask): Promise<CollectionResult> {
  const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();

  const userPrompt = `请整理关于"${task.target.name}"的产业信息。

节点类型：${task.target.node_type}
所属坐标系：${task.target.coordinate_systems.join(', ')}
${task.context ? `背景上下文：${task.context}` : ''}

请输出符合以下 Schema 的 JSON：
{
  "nodes": [/* 节点数组，每个节点需包含 id, name, node_type, coordinate_systems, created_at, updated_at */],
  "edges": [/* 边数组，每条边需包含 id, source, target, relation_type, verification_status, created_at, updated_at */],
  "review_notes": "/* 需要人工审核的注意事项或数据质量说明 */"
}`;

  try {
    const apiBase = process.env.LLM_API_BASE || 'https://api.openai.com/v1';
    const model = process.env.LLM_MODEL || 'gpt-4o';

    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        task_id: taskId,
        status: 'failed',
        created_at: now,
        error: `API 错误: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      return {
        task_id: taskId,
        status: 'failed',
        created_at: now,
        error: 'LLM 返回内容为空',
      };
    }

    let parsedData: ParsedLLMResponse = { nodes: [], edges: [], review_notes: '' };
    try {
      const parsed = JSON.parse(rawContent);
      parsedData = {
        nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
        edges: Array.isArray(parsed.edges) ? parsed.edges : [],
        review_notes: typeof parsed.review_notes === 'string' ? parsed.review_notes : '',
      };
    } catch {
      return {
        task_id: taskId,
        status: 'failed',
        raw_response: rawContent,
        created_at: now,
        error: '无法解析 LLM 返回的 JSON',
      };
    }

    if (!validate(parsedData)) {
      const schemaErrors = validate.errors?.map(e => `${e.instancePath} ${e.message}`).join('; ');
      return {
        task_id: taskId,
        status: 'partial',
        raw_response: rawContent,
        collected_data: parsedData,
        review_notes: parsedData.review_notes || `Schema 验证失败: ${schemaErrors}`,
        created_at: now,
        error: `Schema 验证失败: ${schemaErrors}`,
      };
    }

    const processedEdges = (parsedData.edges || []).map((edge: any) => ({
      ...edge,
      verification_status: 'proposed',
      created_at: edge.created_at || now,
      updated_at: edge.updated_at || now,
    }));

    return {
      task_id: taskId,
      status: 'success',
      collected_data: {
        nodes: (parsedData.nodes || []).map((node: any) => ({
          ...node,
          created_at: node.created_at || now,
          updated_at: node.updated_at || now,
        })),
        edges: processedEdges,
      },
      raw_response: rawContent,
      review_notes: parsedData.review_notes,
      created_at: now,
    };
  } catch (error) {
    return {
      task_id: taskId,
      status: 'failed',
      created_at: now,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

export async function collectBatch(
  tasks: CollectionTask[],
  onProgress?: (index: number, total: number, result: CollectionResult) => void
): Promise<CollectionResult[]> {
  const results: CollectionResult[] = [];

  for (let i = 0; i < tasks.length; i++) {
    const result = await collectNode(tasks[i]);
    results.push(result);
    onProgress?.(i + 1, tasks.length, result);
    
    if (i < tasks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}
