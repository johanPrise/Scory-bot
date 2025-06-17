import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script de migration pour le frontend - Phase 2
 * Remplace les anciens fichiers par les nouveaux adaptés à l'API MongoDB
 */
async function migrateFrontend() {
  console.log('🔄 Migration du frontend vers la nouvelle API...');
  
  const srcDir = path.join(__dirname, 'src');
  
  const migrations = [
    // API
    {
      old: path.join(srcDir, 'api.js'),
      new: path.join(srcDir, 'api.new.js'),
      backup: path.join(srcDir, 'api.backup.js')
    },
    // Contexte d'authentification
    {
      old: path.join(srcDir, 'context', 'AuthContext.js'),
      new: path.join(srcDir, 'context', 'AuthContext.new.js'),
      backup: path.join(srcDir, 'context', 'AuthContext.backup.js')
    },
    // Pages
    {
      old: path.join(srcDir, 'pages', 'Login.js'),
      new: path.join(srcDir, 'pages', 'Login.new.js'),
      backup: path.join(srcDir, 'pages', 'Login.backup.js')
    },
    {
      old: path.join(srcDir, 'pages', 'Dashboard.js'),
      new: path.join(srcDir, 'pages', 'Dashboard.new.js'),
      backup: path.join(srcDir, 'pages', 'Dashboard.backup.js')
    },
    {
      old: path.join(srcDir, 'pages', 'Teams.js'),
      new: path.join(srcDir, 'pages', 'Teams.new.js'),
      backup: path.join(srcDir, 'pages', 'Teams.backup.js')
    }
  ];

  for (const migration of migrations) {
    try {
      // Vérifier que le nouveau fichier existe
      if (!fs.existsSync(migration.new)) {
        console.log(`⚠️  Nouveau fichier non trouvé: ${path.basename(migration.new)}`);
        continue;
      }

      // Sauvegarder l'ancien fichier
      if (fs.existsSync(migration.old)) {
        fs.copyFileSync(migration.old, migration.backup);
        console.log(`📦 Sauvegarde créée: ${path.basename(migration.backup)}`);
      }

      // Remplacer par le nouveau fichier
      fs.copyFileSync(migration.new, migration.old);
      console.log(`✅ Fichier migré: ${path.basename(migration.old)}`);

      // Supprimer le fichier temporaire
      fs.unlinkSync(migration.new);
      console.log(`🗑️  Fichier temporaire supprimé: ${path.basename(migration.new)}`);

    } catch (error) {
      console.error(`❌ Erreur lors de la migration de ${path.basename(migration.old)}:`, error.message);
    }
  }

  console.log('✅ Migration du frontend terminée');
}

/**
 * Script de rollback pour restaurer les anciens fichiers
 */
async function rollbackFrontend() {
  console.log('🔄 Rollback du frontend...');
  
  const srcDir = path.join(__dirname, 'src');
  
  const rollbacks = [
    {
      current: path.join(srcDir, 'api.js'),
      backup: path.join(srcDir, 'api.backup.js')
    },
    {
      current: path.join(srcDir, 'context', 'AuthContext.js'),
      backup: path.join(srcDir, 'context', 'AuthContext.backup.js')
    },
    {
      current: path.join(srcDir, 'pages', 'Login.js'),
      backup: path.join(srcDir, 'pages', 'Login.backup.js')
    },
    {
      current: path.join(srcDir, 'pages', 'Dashboard.js'),
      backup: path.join(srcDir, 'pages', 'Dashboard.backup.js')
    },
    {
      current: path.join(srcDir, 'pages', 'Teams.js'),
      backup: path.join(srcDir, 'pages', 'Teams.backup.js')
    }
  ];

  for (const rollback of rollbacks) {
    try {
      // Vérifier que la sauvegarde existe
      if (!fs.existsSync(rollback.backup)) {
        console.log(`⚠️  Sauvegarde non trouvée: ${path.basename(rollback.backup)}`);
        continue;
      }

      // Restaurer la sauvegarde
      fs.copyFileSync(rollback.backup, rollback.current);
      console.log(`✅ Fichier restauré: ${path.basename(rollback.current)}`);

    } catch (error) {
      console.error(`❌ Erreur lors du rollback de ${path.basename(rollback.current)}:`, error.message);
    }
  }

  console.log('✅ Rollback du frontend terminé');
}

/**
 * Mise à jour du package.json pour ajouter les scripts de migration
 */
async function updatePackageJson() {
  console.log('📝 Mise à jour du package.json...');
  
  const packageJsonPath = path.join(__dirname, 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Ajouter les scripts de migration
    packageJson.scripts = {
      ...packageJson.scripts,
      'migrate:frontend': 'node migrate-frontend.js migrate',
      'rollback:frontend': 'node migrate-frontend.js rollback'
    };

    // Ajouter le type module si pas déjà présent
    if (!packageJson.type) {
      packageJson.type = 'module';
    }

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ package.json mis à jour');
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du package.json:', error.message);
  }
}

// Déterminer l'action à effectuer
const action = process.argv[2];

if (action === 'migrate') {
  migrateFrontend();
} else if (action === 'rollback') {
  rollbackFrontend();
} else if (action === 'update-package') {
  updatePackageJson();
} else {
  console.log(`
Usage: node migrate-frontend.js [action]

Actions disponibles:
  migrate        - Migrer vers les nouveaux composants adaptés à l'API MongoDB
  rollback       - Restaurer les anciens composants
  update-package - Mettre à jour le package.json avec les scripts de migration

Exemple:
  node migrate-frontend.js migrate
  node migrate-frontend.js rollback
  node migrate-frontend.js update-package
  `);
}