const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Monitora a raiz e o subdiretório
config.watchFolders = [workspaceRoot];

// 2. Garanta que o Metro busque os módulos primeiramente no mobile
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Bloqueie duplicidade de resolução do react-native
config.resolver.disableHierarchicalLookup = false;

module.exports = config;