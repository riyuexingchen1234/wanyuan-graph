import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from '../../schema.json';

const ajv = new Ajv({ allErrors: true });
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