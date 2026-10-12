// lib/logger.js
// Tiny logging facade: full console output in dev builds; quiet in production.
// Keeps noisy log/debug/info out of release builds while preserving
// actionable warnings and errors for crash-reporting tooling.

const isDev = typeof __DEV__ !== "undefined" && __DEV__;

const _noop = () => {};

export const logger = {
  log: isDev ? console.log : _noop,
  debug: isDev ? console.debug : _noop,
  info: isDev ? console.info : _noop,
  // warn and error always pass through so production bugs remain visible.
  warn: console.warn,
  error: console.error,
};

export default logger;
