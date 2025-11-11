// In config-overrides.js or craco.config.js (if using craco)
module.exports = function override(config) {
  config.ignoreWarnings = [/Failed to parse source map/];
  return config;
};
