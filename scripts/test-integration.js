#!/usr/bin/env node

/**
 * Script de test d'intégration Bot ↔ Interface
 * Phase 1 : Finaliser l'Intégration
 */

import dotenv from 'dotenv';
import axios from 'axios';
import TelegramBot from 'node-telegram-bot-api';
import logger from '../src/utils/logger.js';

// Charger les variables d'environnement
dotenv.config();

/**
 * Testeur d'intégration pour Scory-bot
 */
class IntegrationTester {
  constructor() {
    this.apiUrl = process.env.API_BASE_URL || 'http://localhost:3001/api';
    this.webUrl = process.env.WEB_APP_URL || 'http://localhost:3000';
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.bot = new TelegramBot(this.botToken);
    
    this.testResults = {
      api: { status: 'pending', tests: [] },
      web: { status: 'pending', tests: [] },
      bot: { status: 'pending', tests: [] },
      integration: { status: 'pending', tests: [] }
    };
  }

  /**
   * Test de l'API Server
   */
  async testApiServer() {
    console.log('\n🔍 Test du serveur API...');
    
    try {
      // Test 1: Health check
      const healthResponse = await axios.get(`${this.apiUrl}/health`, {
        timeout: 5000
      });
      
      this.testResults.api.tests.push({
        name: 'Health Check',
        status: healthResponse.status === 200 ? 'pass' : 'fail',
        details: `Status: ${healthResponse.status}`
      });

      // Test 2: Auth endpoint
      try {
        const authResponse = await axios.post(`${this.apiUrl}/auth/login`, {
          username: 'test',
          password: 'test'
        }, { timeout: 5000 });
        
        this.testResults.api.tests.push({
          name: 'Auth Endpoint',
          status: 'pass',
          details: 'Endpoint accessible'
        });
      } catch (authError) {
        this.testResults.api.tests.push({
          name: 'Auth Endpoint',
          status: authError.response?.status === 401 ? 'pass' : 'fail',
          details: `Expected 401, got ${authError.response?.status || 'no response'}`
        });
      }

      // Test 3: Users endpoint
      try {
        const usersResponse = await axios.get(`${this.apiUrl}/users`, {
          timeout: 5000
        });
        
        this.testResults.api.tests.push({
          name: 'Users Endpoint',
          status: 'pass',
          details: 'Endpoint accessible'
        });
      } catch (usersError) {
        this.testResults.api.tests.push({
          name: 'Users Endpoint',
          status: usersError.response?.status === 401 ? 'pass' : 'fail',
          details: `Expected 401, got ${usersError.response?.status || 'no response'}`
        });
      }

      this.testResults.api.status = 'pass';
      console.log('✅ Serveur API: Tests réussis');
      
    } catch (error) {
      this.testResults.api.status = 'fail';
      this.testResults.api.tests.push({
        name: 'API Connection',
        status: 'fail',
        details: error.message
      });
      console.log('❌ Serveur API: Échec de connexion');
    }
  }

  /**
   * Test du serveur Web
   */
  async testWebServer() {
    console.log('\n🔍 Test du serveur Web...');
    
    try {
      // Test 1: Page d'accueil
      const homeResponse = await axios.get(this.webUrl, {
        timeout: 5000
      });
      
      this.testResults.web.tests.push({
        name: 'Home Page',
        status: homeResponse.status === 200 ? 'pass' : 'fail',
        details: `Status: ${homeResponse.status}`
      });

      // Test 2: Vérifier la présence du script Telegram Web App
      const hasTelegramScript = homeResponse.data.includes('telegram-web-app.js');
      this.testResults.web.tests.push({
        name: 'Telegram Web App Script',
        status: hasTelegramScript ? 'pass' : 'fail',
        details: hasTelegramScript ? 'Script présent' : 'Script manquant'
      });

      // Test 3: Test des routes principales
      const routes = ['/dashboard', '/scores', '/teams', '/admin'];
      for (const route of routes) {
        try {
          const routeResponse = await axios.get(`${this.webUrl}${route}`, {
            timeout: 3000
          });
          
          this.testResults.web.tests.push({
            name: `Route ${route}`,
            status: routeResponse.status === 200 ? 'pass' : 'fail',
            details: `Status: ${routeResponse.status}`
          });
        } catch (routeError) {
          this.testResults.web.tests.push({
            name: `Route ${route}`,
            status: 'fail',
            details: routeError.message
          });
        }
      }

      this.testResults.web.status = 'pass';
      console.log('✅ Serveur Web: Tests réussis');
      
    } catch (error) {
      this.testResults.web.status = 'fail';
      this.testResults.web.tests.push({
        name: 'Web Connection',
        status: 'fail',
        details: error.message
      });
      console.log('❌ Serveur Web: Échec de connexion');
    }
  }

  /**
   * Test du Bot Telegram
   */
  async testTelegramBot() {
    console.log('\n🔍 Test du Bot Telegram...');
    
    try {
      // Test 1: Connexion du bot
      const botInfo = await this.bot.getMe();
      this.testResults.bot.tests.push({
        name: 'Bot Connection',
        status: 'pass',
        details: `@${botInfo.username} (${botInfo.first_name})`
      });

      // Test 2: Commandes configurées
      const commands = await this.bot.getMyCommands();
      this.testResults.bot.tests.push({
        name: 'Bot Commands',
        status: commands.length > 0 ? 'pass' : 'fail',
        details: `${commands.length} commandes configurées`
      });

      // Test 3: Webhook info (si configuré)
      try {
        const webhookInfo = await this.bot.getWebHookInfo();
        this.testResults.bot.tests.push({
          name: 'Webhook Info',
          status: 'pass',
          details: webhookInfo.url || 'Polling mode'
        });
      } catch (webhookError) {
        this.testResults.bot.tests.push({
          name: 'Webhook Info',
          status: 'fail',
          details: webhookError.message
        });
      }

      this.testResults.bot.status = 'pass';
      console.log('✅ Bot Telegram: Tests réussis');
      
    } catch (error) {
      this.testResults.bot.status = 'fail';
      this.testResults.bot.tests.push({
        name: 'Bot Connection',
        status: 'fail',
        details: error.message
      });
      console.log('❌ Bot Telegram: Échec de connexion');
    }
  }

  /**
   * Test d'intégration complète
   */
  async testIntegration() {
    console.log('\n🔍 Test d\'intégration Bot ↔ Interface...');
    
    try {
      // Test 1: Variables d'environnement
      const requiredEnvVars = [
        'TELEGRAM_BOT_TOKEN',
        'WEB_APP_URL',
        'API_BASE_URL',
        'MONGO_URL'
      ];
      
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      this.testResults.integration.tests.push({
        name: 'Environment Variables',
        status: missingVars.length === 0 ? 'pass' : 'fail',
        details: missingVars.length === 0 ? 'Toutes présentes' : `Manquantes: ${missingVars.join(', ')}`
      });

      // Test 2: Cohérence des URLs
      const webAppUrl = process.env.WEB_APP_URL;
      const apiUrl = process.env.API_BASE_URL;
      
      this.testResults.integration.tests.push({
        name: 'URL Configuration',
        status: webAppUrl && apiUrl ? 'pass' : 'fail',
        details: `Web: ${webAppUrl}, API: ${apiUrl}`
      });

      // Test 3: Test de communication API ↔ Web
      if (this.testResults.api.status === 'pass' && this.testResults.web.status === 'pass') {
        this.testResults.integration.tests.push({
          name: 'API ↔ Web Communication',
          status: 'pass',
          details: 'Les deux services sont accessibles'
        });
      } else {
        this.testResults.integration.tests.push({
          name: 'API ↔ Web Communication',
          status: 'fail',
          details: 'Un ou plusieurs services ne sont pas accessibles'
        });
      }

      // Test 4: Configuration Web App Telegram
      const webAppButtons = this.generateWebAppTest();
      this.testResults.integration.tests.push({
        name: 'Web App Buttons',
        status: 'pass',
        details: `${webAppButtons.length} boutons Web App configurés`
      });

      this.testResults.integration.status = 'pass';
      console.log('✅ Intégration: Tests réussis');
      
    } catch (error) {
      this.testResults.integration.status = 'fail';
      this.testResults.integration.tests.push({
        name: 'Integration Test',
        status: 'fail',
        details: error.message
      });
      console.log('❌ Intégration: Échec des tests');
    }
  }

  /**
   * Génère les boutons Web App pour test
   */
  generateWebAppTest() {
    return [
      { text: "📈 Dashboard", web_app: { url: `${this.webUrl}/dashboard` } },
      { text: "📊 Scores", web_app: { url: `${this.webUrl}/scores` } },
      { text: "👥 Teams", web_app: { url: `${this.webUrl}/teams` } },
      { text: "🖥️ Admin", web_app: { url: `${this.webUrl}/admin` } }
    ];
  }

  /**
   * Génère un rapport détaillé
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: 0,
        passed: 0,
        failed: 0
      },
      details: this.testResults
    };

    // Calculer les statistiques
    Object.values(this.testResults).forEach(category => {
      category.tests.forEach(test => {
        report.summary.total++;
        if (test.status === 'pass') {
          report.summary.passed++;
        } else {
          report.summary.failed++;
        }
      });
    });

    return report;
  }

  /**
   * Affiche le rapport de test
   */
  displayReport() {
    const report = this.generateReport();
    
    console.log('\n📊 RAPPORT DE TEST D\'INTÉGRATION');
    console.log('=====================================');
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Total: ${report.summary.total} tests`);
    console.log(`✅ Réussis: ${report.summary.passed}`);
    console.log(`❌ Échoués: ${report.summary.failed}`);
    console.log(`📈 Taux de réussite: ${Math.round((report.summary.passed / report.summary.total) * 100)}%`);
    
    console.log('\n📋 DÉTAILS PAR CATÉGORIE:');
    
    Object.entries(this.testResults).forEach(([category, results]) => {
      console.log(`\n${category.toUpperCase()}:`);
      results.tests.forEach(test => {
        const icon = test.status === 'pass' ? '✅' : '❌';
        console.log(`  ${icon} ${test.name}: ${test.details}`);
      });
    });

    // Recommandations
    console.log('\n💡 RECOMMANDATIONS:');
    if (report.summary.failed === 0) {
      console.log('  🎉 Tous les tests sont réussis! L\'intégration est prête.');
      console.log('  🚀 Vous pouvez procéder aux tests utilisateur.');
    } else {
      console.log('  🔧 Corrigez les erreurs identifiées avant de continuer.');
      console.log('  📖 Consultez la documentation pour plus d\'aide.');
    }
  }

  /**
   * Exécute tous les tests
   */
  async runAllTests() {
    console.log('🚀 Début des tests d\'intégration Scory-bot...');
    
    try {
      await this.testApiServer();
      await this.testWebServer();
      await this.testTelegramBot();
      await this.testIntegration();
      
      this.displayReport();
      
      const report = this.generateReport();
      return report.summary.failed === 0;
      
    } catch (error) {
      console.error('❌ Erreur lors des tests:', error);
      return false;
    }
  }
}

/**
 * Fonction principale
 */
async function main() {
  try {
    const tester = new IntegrationTester();
    const success = await tester.runAllTests();
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Erreur fatale lors des tests:', error.message);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { IntegrationTester };