// 万源图谱 - 数据本体 Schema 校验
// 读取根目录 schema.json，用 ajv 编译，注册 ajv-formats（date-time / uri）。

import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "fs";
import path from "path";

// 读取根目录 schema.json（项目根 = process.cwd()）
const schemaPath = path.join(process.cwd(), "schema.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));

// ajv 配置：allErrors 收集全部错误；strict:false 关闭未知关键字告警（schema 用了 draft-07 的 $ref/#/definitions）
const ajv = new Ajv({ allErrors: true, strict: false });
// 注册 date-time、uri 等格式校验
addFormats(ajv);

const validate = ajv.compile(schema);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 校验任意数据是否符合 schema.json 定义的数据本体结构。
 * 校验失败时返回详细的错误路径和错误信息。
 */
export function validateGraphData(data: unknown): ValidationResult {
  const valid = validate(data);
  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors = (validate.errors ?? []).map((err) => {
    const instancePath = err.instancePath || "(root)";
    const params = err.params && Object.keys(err.params).length > 0
      ? ` ${JSON.stringify(err.params)}`
      : "";
    return `${instancePath}: ${err.message}${params}`;
  });

  return { valid: false, errors };
}
