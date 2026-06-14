const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  monorepoRoot,
];

// @rnmapbox/maps web entry imports mapbox-gl CSS which Metro can't handle
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.endsWith('.css')) {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
