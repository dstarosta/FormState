// Reads `process.env.NODE_ENV` without a `typeof process` guard so that bundlers (Vite, webpack)
// can statically replace it; browsers without a `process` global throw and fall back to production.
const getNodeEnv = (): string | undefined => {
  try {
    return process.env['NODE_ENV'];
  } catch {
    return undefined;
  }
};

export const IS_DEVELOPMENT = getNodeEnv()?.toLowerCase() === 'development';
