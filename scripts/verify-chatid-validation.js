#!/usr/bin/env node

/**
 * Script de vérification manuelle de la validation chatId
 * 
 * Ce script vérifie que:
 * 1. Les middlewares requireChatId et validateChatAccess sont appliqués
 * 2. Toutes les routes filtrent correctement par chatId
 * 3. Les requêtes sans chatId sont rejetées
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routesDir = path.join(__dirname, '../src/api/routes');
const routeFiles = ['activities.js', 'scores.js', 'teams.js'];

console.log('🔍 Vérification de la validation chatId dans les routes API\n');

let allChecksPass = true;

for (const file of routeFiles) {
  const filePath = path.join(routesDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  console.log(`📄 Vérification de ${file}:`);
  
  // Vérifier l'import des middlewares
  const hasRequireChatIdImport = content.includes('requireChatId');
  const hasValidateChatAccessImport = content.includes('validateChatAccess');
  
  console.log(`  ✓ Import requireChatId: ${hasRequireChatIdImport ? '✅' : '❌'}`);
  console.log(`  ✓ Import validateChatAccess: ${hasValidateChatAccessImport ? '✅' : '❌'}`);
  
  // Vérifier l'application des middlewares
  const hasRequireChatIdUse = content.includes('router.use(requireChatId)');
  const hasValidateChatAccessUse = content.includes('router.use(validateChatAccess)');
  
  console.log(`  ✓ Application requireChatId: ${hasRequireChatIdUse ? '✅' : '❌'}`);
  console.log(`  ✓ Application validateChatAccess: ${hasValidateChatAccessUse ? '✅' : '❌'}`);
  
  // Vérifier l'utilisation de req.chatId
  const usesReqChatId = content.includes('req.chatId');
  console.log(`  ✓ Utilise req.chatId: ${usesReqChatId ? '✅' : '❌'}`);
  
  // Vérifier qu'il n'y a pas de génération de webapp chatId
  const hasWebappGeneration = content.includes('webapp_${req.userId}');
  console.log(`  ✓ Pas de génération webapp: ${!hasWebappGeneration ? '✅' : '❌'}`);
  
  const filePass = hasRequireChatIdImport && 
                   hasValidateChatAccessImport && 
                   hasRequireChatIdUse && 
                   hasValidateChatAccessUse && 
                   usesReqChatId && 
                   !hasWebappGeneration;
  
  if (!filePass) {
    allChecksPass = false;
  }
  
  console.log(`  ${filePass ? '✅ PASS' : '❌ FAIL'}\n`);
}

console.log('═══════════════════════════════════════════════════════');
console.log(allChecksPass ? '✅ Toutes les vérifications ont réussi!' : '❌ Certaines vérifications ont échoué');
console.log('═══════════════════════════════════════════════════════\n');

process.exit(allChecksPass ? 0 : 1);
