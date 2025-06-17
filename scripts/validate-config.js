#!/usr/bin/env node

/**
 * Script de validation de la configuration des ports et URLs
 * Vérifie la cohérence entre tous les fichiers de configuration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Configuration attendue
const EXPECTED_CONFIG = {
  API_PORT: '3001',
  WEB_PORT: '3000',
  MOCK_SERVER_PORT: '3002',
  API_BASE_URL: 'http://localhost:3001/api',
  REACT_APP_API_URL: 'http://localhost:3001/api'
};

// Fichiers à vérifier
const FILES_TO_CHECK = [
  {
    path: '.env',
    patterns: [
      { key: 'API_PORT', regex: /API_PORT=(\d+)/ },
      { key: 'API_BASE_URL', regex: /API_BASE_URL=(.+)/ }
    ]
  },
  {
    path: 'web/.env',
    patterns: [
      { key: 'REACT_APP_API_URL', regex: /REACT_APP_API_URL=(.+)/ },
      { key: 'WEB_PORT', regex: /PORT=(\d+)/ }
    ]
  },
  {
    path: 'src/services/apiService.js',
    patterns: [
      { key: 'API_BASE_URL', regex: /'(http:\/\/localhost:\d+\/api)'/ }
    ]
  },
  {
    path: 'web/src/api.js',
    patterns: [
      { key: 'REACT_APP_API_URL', regex: /'(http:\/\/localhost:\d+\/api)'/ }
    ]
  },
  {
    path: 'server.js',
    patterns: [
      { key: 'MOCK_SERVER_PORT', regex: /MOCK_SERVER_PORT.*\|\|.*?(\d+)/ }
    ]
  },
  {
    path: 'api-server.js',
    patterns: [
      { key: 'API_PORT', regex: /API_PORT.*\|\|.*?(\d+)/ }
    ]
  }
];

console.log('🔍 Validation de la configuration des ports et URLs...\n');

let hasErrors = false;
const results = [];

// Vérifier chaque fichier
for (const fileConfig of FILES_TO_CHECK) {
  const filePath = path.join(rootDir, fileConfig.path);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Fichier manquant: ${fileConfig.path}`);
    hasErrors = true;
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  
  for (const pattern of fileConfig.patterns) {
    const match = content.match(pattern.regex);
    
    if (match) {
      const value = match[1];
      const expected = EXPECTED_CONFIG[pattern.key];
      
      if (expected && value !== expected) {
        console.log(`❌ ${fileConfig.path}: ${pattern.key} = "${value}" (attendu: "${expected}")`);
        hasErrors = true;
      } else {
        console.log(`✅ ${fileConfig.path}: ${pattern.key} = "${value}"`);
      }
      
      results.push({
        file: fileConfig.path,
        key: pattern.key,
        value,
        expected,
        valid: !expected || value === expected
      });
    } else {
      console.log(`⚠️  ${fileConfig.path}: ${pattern.key} non trouvé`);
    }
  }
}

console.log('\n📊 Résumé de la validation:');
console.log('================================');

// Grouper par clé de configuration
const groupedResults = {};
results.forEach(result => {
  if (!groupedResults[result.key]) {
    groupedResults[result.key] = [];
  }
  groupedResults[result.key].push(result);
});

// Afficher le résumé
Object.keys(groupedResults).forEach(key => {
  const configs = groupedResults[key];
  const values = [...new Set(configs.map(c => c.value))];
  
  if (values.length === 1) {
    console.log(`✅ ${key}: Cohérent (${values[0]})`);
  } else {
    console.log(`❌ ${key}: Incohérent`);
    configs.forEach(config => {
      console.log(`   - ${config.file}: ${config.value}`);
    });
    hasErrors = true;
  }
});

console.log('\n🎯 Recommandations:');
console.log('===================');

if (hasErrors) {
  console.log('❌ Des incohérences ont été détectées.');
  console.log('📝 Utilisez les valeurs suivantes pour corriger:');
  Object.keys(EXPECTED_CONFIG).forEach(key => {
    console.log(`   ${key}=${EXPECTED_CONFIG[key]}`);
  });
  process.exit(1);
} else {
  console.log('✅ Toutes les configurations sont cohérentes!');
  console.log('🚀 Vous pouvez démarrer l\'application en toute sécurité.');
}

console.log('\n📚 Pour plus d\'informations, consultez PORTS_CONFIG.md');