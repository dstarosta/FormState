export const IS_DEVELOPMENT =
  typeof process === 'object' &&
  process.env &&
  process.env['NODE_ENV']?.toLowerCase() === 'development';
