#!/usr/bin/env node

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Charger les variables d'environnement
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration requise pour l'application
 */
const REQUIRED_CONFIG = {
  // Base de données
  MONGO_URL: {
    required: true,
    description: 'URL de connexion MongoDB',
    example: 'mongodb://localhost:27017/scory-bot'
  },
  
  // JWT
  JWT_SECRET: {
    required: true,
    description: 'Clé secrète pour les tokens JWT',
    example: 'your-super-secret-jwt-key'
  },
  
  // Telegram
  TELEGRAM_BOT_TOKEN: {
    required: true,
    description: 'Token du bot Telegram',
    example: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz'
  },
  
  // API
  API_PORT: {
    required: false,
    default: '3001',
    description: 'Port du serveur API'
  },
  
  // Web App
  WEB_PORT: {
    required: false,
    default: '3000',
    description: 'Port du serveur web'
  },
  
  // Environnement
  NODE_ENV: {
    required: false,
    default: 'development',
    description: 'Environnement d\'exécution',
    validValues: ['development', 'production', 'test']
  }
};

/**
 * Configuration optionnelle mais recommandée
 */
const OPTIONAL_CONFIG = {
  ADMIN_CHAT_ID: {
    description: 'ID du chat admin pour les notifications',
    example: '123456789'
  },
  
  ALLOWED_ORIGINS: {
    description: 'Origines autorisées pour CORS',
    example: 'http://localhost:3000,https://yourdomain.com'
  },
  
  LOG_LEVEL: {
    description: 'Niveau de logging',
    default: 'info',
    validValues: ['error', 'warn', 'info', 'debug']
  },
  
  GEMINI_API_KEY: {
    description: 'Clé API pour Gemini (IA)',
    example: 'your-gemini-api-key'
  }
};

/**
 * Valide une variable d'environnement
 */
function validateEnvVar(key, config) {
  const value = process.env[key];
  const errors = [];
  const warnings = [];
  
  // Vérifier si requis
  if (config.required && !value) {
    errors.push(`❌ ${key} est requis mais manquant`);
    if (config.example) {
      errors.push(`   Exemple: ${config.example}`);
    }
    return { errors, warnings };
  }
  
  // Utiliser la valeur par défaut si pas définie
  if (!value && config.default) {
    warnings.push(`⚠️  ${key} non défini, utilisation de la valeur par défaut: ${config.default}`);
    return { errors, warnings };
  }
  
  // Vérifier les valeurs valides
  if (value && config.validValues && !config.validValues.includes(value)) {
    errors.push(`❌ ${key}="${value}" n'est pas une valeur valide`);
    errors.push(`   Valeurs acceptées: ${config.validValues.join(', ')}`);
    return { errors, warnings };
  }
  
  // Validations spécifiques
  if (key === 'MONGO_URL' && value) {
    if (!value.startsWith('mongodb://') && !value.startsWith('mongodb+srv://')) {
      errors.push(`❌ ${key} doit commencer par "mongodb://" ou "mongodb+srv://"`);
    }
  }
  
  if (key === 'TELEGRAM_BOT_TOKEN' && value) {
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(value)) {
      errors.push(`❌ ${key} ne semble pas être un token Telegram valide`);
    }
  }
  
  if (key === 'JWT_SECRET' && value) {
    if (value.length < 32) {
      warnings.push(`⚠️  ${key} devrait faire au moins 32 caractères pour une sécurité optimale`);
    }
  }
  
  if ((key === 'API_PORT' || key === 'WEB_PORT') && value) {
    const port = parseInt(value);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push(`❌ ${key}="${value}" n'est pas un port valide (1-65535)`);
    }
  }
  
  return { errors, warnings };
}

/**
 * Fonction principale de validation
 */
function validateConfig() {
  console.log('🔍 Validation de la configuration...\n');
  
  let totalErrors = 0;
  let totalWarnings = 0;
  
  // Valider la configuration requise
  console.log('📋 Configuration requise:');
  for (const [key, config] of Object.entries(REQUIRED_CONFIG)) {
    const { errors, warnings } = validateEnvVar(key, config);
    
    if (errors.length === 0 && warnings.length === 0) {
      console.log(`✅ ${key}: OK`);
    } else {
      errors.forEach(error => console.log(`   ${error}`));
      warnings.forEach(warning => console.log(`   ${warning}`));
    }
    
    totalErrors += errors.length;
    totalWarnings += warnings.length;
  }
  
  console.log('\n📋 Configuration optionnelle:');
  for (const [key, config] of Object.entries(OPTIONAL_CONFIG)) {
    const value = process.env[key];
    
    if (value) {
      const { errors, warnings } = validateEnvVar(key, config);
      
      if (errors.length === 0 && warnings.length === 0) {
        console.log(`✅ ${key}: OK`);
      } else {
        errors.forEach(error => console.log(`   ${error}`));
        warnings.forEach(warning => console.log(`   ${warning}`));
      }
      
      totalErrors += errors.length;
      totalWarnings += warnings.length;
    } else {
      console.log(`ℹ️  ${key}: Non défini (${config.description})`);
    }
  }
  
  // Résumé
  console.log('\n' + '='.repeat(50));
  console.log('📊 Résumé de la validation:');
  console.log(`   Erreurs: ${totalErrors}`);
  console.log(`   Avertissements: ${totalWarnings}`);
  
  if (totalErrors === 0) {
    console.log('\n✅ Configuration valide! L\'application peut démarrer.');
    process.exit(0);
  } else {
    console.log('\n❌ Configuration invalide. Corrigez les erreurs avant de démarrer.');
    console.log('\n💡 Consultez le fichier .env.example pour des exemples de configuration.');
    process.exit(1);
  }
}

// Exécuter la validation
validateConfig();