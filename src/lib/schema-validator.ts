import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from '../../schema.json';

// 【v0.4】schema.json 顶层有 version、description 等自定义字段，
// 各类 enum 还附带 categoryDescriptions / statusDescriptions 等说明字段。
// AJV v8 默认 strict 模式会把这些当作未知 keyword 报错，因此关闭 strict。
// strict: false → 允许未知 keyword；strictSchema: false → 允许 schema 未知 keyword（v8 新选项）。
// 数据校验仍保留严格语义（unknownFormats 等仍生效）。
const ajv = new Ajv({ allErrors: true, strict: false, strictSchema: false });
addFormats(ajv);

const validate = ajv.compile(schema);

export function validateGraphData(data: unknown): { valid: boolean; errors: string[] } {
  const valid = validate(data);
  if (valid) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: validate.errors ? validate.errors.map(e => `${e.instancePath} ${e.message}`) : [],
  };
}