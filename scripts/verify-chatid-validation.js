#!/usr/bin/env node

/**
 * Script de vérification manuelle de la validation chatId
 * 
 * Ce script vérifie que:
 * 1. Les middlewares requireChatId et validateChatAccess sont appliqués
 * 2. Toutes les routes filtrent correctement par chatId
 * 3. Les requêtes sans chatId sont rejetées
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
const { requireChatId } = await import('../src/api/middleware/chatIdValidator.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routesDir = path.join(__dirname, '../src/api/routes');
const routeChecks = [
  {
    file: 'activities.js',
    scopedReadPattern: /Activity\.findOne\(resourceInChatFilter\(id,\s*req\.chatId\)\)/,
    scopedDeletePattern: /Activity\.deleteOne\(resourceInChatFilter\(id,\s*req\.chatId\)\)/,
    forbiddenPatterns: [
      /Activity\.findById\(id\)/,
      /Activity\.findByIdAndDelete/
    ]
  },
  {
    file: 'scores.js',
    scopedReadPattern: /Score\.findOne\(scoreInChatFilter\(id,\s*req\.chatId\)\)/,
    scopedDeletePattern: /Score\.deleteOne\(scoreInChatFilter\(id,\s*req\.chatId\)\)/,
    extraPatterns: [
      /checkDuplicateScore\(\{[\s\S]*chatId:\s*req\.chatId[\s\S]*\}\)/,
      /Activity\.findOne\(resourceInChatFilter\(activityId,\s*req\.chatId\)\)/
    ],
    forbiddenPatterns: [
      /Score\.findById\(id\)/,
      /Score\.findByIdAndDelete/,
      /Activity\.findById\(activityId\)/
    ]
  },
  {
    file: 'teams.js',
    scopedReadPattern: /Team\.findOne\(resourceInChatFilter\(id,\s*req\.chatId\)\)/,
    scopedDeletePattern: /Team\.deleteOne\(resourceInChatFilter\(id,\s*req\.chatId\)\)/,
    forbiddenPatterns: [
      /Team\.findById\(id\)/,
      /Team\.findByIdAndDelete/
    ]
  }
];

const createMockRes = () => ({
  statusCode: null,
  jsonData: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(data) {
    this.jsonData = data;
    return this;
  }
});

const createMockNext = () => {
  const next = () => {
    next.called = true;
  };
  next.called = false;
  return next;
};

const runCheck = (label, passed) => {
  console.log(`  ✓ ${label}: ${passed ? '✅' : '❌'}`);
  return passed;
};

const verifyRequireChatIdBehavior = () => {
  console.log('🧪 Vérification comportementale de requireChatId:');

  const missingReq = { query: {}, body: {}, params: {}, path: '/test', method: 'POST' };
  const missingRes = createMockRes();
  const missingNext = createMockNext();
  requireChatId(missingReq, missingRes, missingNext);

  const rejectsMissing = missingRes.statusCode === 400 &&
    missingRes.jsonData?.error === 'chatId is required' &&
    !missingNext.called;

  const metadataReq = { query: {}, body: { metadata: { chatId: 123456 } }, params: {}, path: '/test', method: 'POST' };
  const metadataRes = createMockRes();
  const metadataNext = createMockNext();
  requireChatId(metadataReq, metadataRes, metadataNext);

  const acceptsMetadata = metadataReq.chatId === '123456' &&
    metadataNext.called &&
    metadataRes.statusCode === null;

  const behaviorPass = runCheck('Rejette les requêtes sans chatId', rejectsMissing) &&
    runCheck('Normalise metadata.chatId en chaîne', acceptsMetadata);

  console.log(`  ${behaviorPass ? '✅ PASS' : '❌ FAIL'}\n`);
  return behaviorPass;
};

console.log('🔍 Vérification de la validation chatId dans les routes API\n');

let allChecksPass = verifyRequireChatIdBehavior();

for (const routeCheck of routeChecks) {
  const { file } = routeCheck;
  const filePath = path.resolve(routesDir, file);
  if (!filePath.startsWith(path.resolve(routesDir) + path.sep)) {
    console.error(`⛔ Chemin invalide détecté: ${file}`);
    process.exit(1);
  }
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

  const hasScopedReads = routeCheck.scopedReadPattern.test(content);
  console.log(`  ✓ Lectures par ID scopées: ${hasScopedReads ? '✅' : '❌'}`);

  const hasScopedDeletes = routeCheck.scopedDeletePattern.test(content);
  console.log(`  ✓ Suppressions par ID scopées: ${hasScopedDeletes ? '✅' : '❌'}`);

  const extraPatternsPass = (routeCheck.extraPatterns || []).every(pattern => pattern.test(content));
  if (routeCheck.extraPatterns?.length) {
    console.log(`  ✓ Validations métier scopées: ${extraPatternsPass ? '✅' : '❌'}`);
  }

  const hasNoForbiddenPatterns = routeCheck.forbiddenPatterns.every(pattern => !pattern.test(content));
  console.log(`  ✓ Pas de findById/delete non scopé: ${hasNoForbiddenPatterns ? '✅' : '❌'}`);
  
  // Vérifier qu'il n'y a pas de génération de webapp chatId
  const hasNoWebappGeneration = !content.includes('webapp_${req.userId}');
  console.log(`  ✓ Pas de génération webapp: ${hasNoWebappGeneration ? '✅' : '❌'}`);
  
  const filePass = hasRequireChatIdImport && 
                   hasValidateChatAccessImport && 
                   hasRequireChatIdUse && 
                   hasValidateChatAccessUse && 
                   usesReqChatId && 
                   hasScopedReads &&
                   hasScopedDeletes &&
                   extraPatternsPass &&
                   hasNoForbiddenPatterns &&
                   hasNoWebappGeneration;
  
  if (!filePass) {
    allChecksPass = false;
  }
  
  console.log(`  ${filePass ? '✅ PASS' : '❌ FAIL'}\n`);
}

console.log('═══════════════════════════════════════════════════════');
console.log(allChecksPass ? '✅ Toutes les vérifications ont réussi!' : '❌ Certaines vérifications ont échoué');
console.log('═══════════════════════════════════════════════════════\n');

process.exit(allChecksPass ? 0 : 1);
