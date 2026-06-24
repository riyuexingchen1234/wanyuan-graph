import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from '../../schema.json';
import type { GraphData, GraphNode, GraphEdge } from './types';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validateSchema = ajv.compile(schema);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateGraphData(data: unknown): ValidationResult {
  const valid = validateSchema(data);
  if (valid) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: validateSchema.errors
      ? validateSchema.errors.map(
          (e) => `${e.instancePath || '/'} ${e.message}`
        )
      : [],
  };
}

export function validateDataIntegrity(data: GraphData): ValidationResult {
  const errors: string[] = [];
  const nodeIds = new Set<string>();

  for (const node of data.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`节点 ID 重复: ${node.id}`);
    }
    nodeIds.add(node.id);
  }

  for (const node of data.nodes) {
    if (node.parent_type && !nodeIds.has(node.parent_type)) {
      errors.push(
        `节点 ${node.id} 的 parent_type 指向不存在的节点: ${node.parent_type}`
      );
    }
  }

  for (const edge of data.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`边 ${edge.id} 的 source 指向不存在的节点: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`边 ${edge.id} 的 target 指向不存在的节点: ${edge.target}`);
    }
  }

  const edgeIds = new Set<string>();
  for (const edge of data.edges) {
    if (edgeIds.has(edge.id)) {
      errors.push(`边 ID 重复: ${edge.id}`);
    }
    edgeIds.add(edge.id);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateAll(data: unknown): ValidationResult {
  const schemaResult = validateGraphData(data);
  if (!schemaResult.valid) {
    return schemaResult;
  }
  return validateDataIntegrity(data as GraphData);
}
