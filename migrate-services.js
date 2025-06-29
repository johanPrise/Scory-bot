import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script de migration pour remplacer les anciens services par les nouveaux
 */
async function migrateServices() {
  console.log('🔄 Migration des services vers MongoDB...');
  
  const servicesDir = path.join(__dirname, 'src', 'services');
  
  const migrations = [
    {
      old: 'scoreService.js',
      new: 'scoreService.js',
      backup: 'scoreService.backup.js'
    },
    {
      old: 'teamService.js',
      new: 'teamService.js',
      backup: 'teamService.backup.js'
    },
    {
      old: 'activityService.js',
      new: 'activityService.js',
      backup: 'activityService.backup.js'
    }
  ];

  for (const migration of migrations) {
    const oldPath = path.join(servicesDir, migration.old);
    const newPath = path.join(servicesDir, migration);
    const backupPath = path.join(servicesDir, migration.backup);

    try {
      // Vérifier que le nouveau fichier existe
      if (!fs.existsSync(newPath)) {
        console.log(`⚠️  Nouveau fichier non trouvé: ${migration}`);
        continue;
      }

      // Sauvegarder l'ancien fichier
      if (fs.existsSync(oldPath)) {
        fs.copyFileSync(oldPath, backupPath);
        console.log(`📦 Sauvegarde créée: ${migration.backup}`);
      }

      // Remplacer par le nouveau fichier
      fs.copyFileSync(newPath, oldPath);
      console.log(`✅ Service migré: ${migration.old}`);

      // Supprimer le fichier temporaire
      fs.unlinkSync(newPath);
      console.log(`🗑️  Fichier temporaire supprimé: ${migration}`);

    } catch (error) {
      console.error(`❌ Erreur lors de la migration de ${migration.old}:`, error.message);
    }
  }

  console.log('✅ Migration des services terminée');
}

/**
 * Script de rollback pour restaurer les anciens services
 */
async function rollbackServices() {
  console.log('🔄 Rollback des services...');
  
  const servicesDir = path.join(__dirname, 'src', 'services');
  
  const rollbacks = [
    {
      current: 'scoreService.js',
      backup: 'scoreService.backup.js'
    },
    {
      current: 'teamService.js',
      backup: 'teamService.backup.js'
    },
    {
      current: 'activityService.js',
      backup: 'activityService.backup.js'
    }
  ];

  for (const rollback of rollbacks) {
    const currentPath = path.join(servicesDir, rollback.current);
    const backupPath = path.join(servicesDir, rollback.backup);

    try {
      // Vérifier que la sauvegarde existe
      if (!fs.existsSync(backupPath)) {
        console.log(`⚠️  Sauvegarde non trouvée: ${rollback.backup}`);
        continue;
      }

      // Restaurer la sauvegarde
      fs.copyFileSync(backupPath, currentPath);
      console.log(`✅ Service restauré: ${rollback.current}`);

    } catch (error) {
      console.error(`❌ Erreur lors du rollback de ${rollback.current}:`, error.message);
    }
  }

  console.log('✅ Rollback des services terminé');
}

// Déterminer l'action à effectuer
const action = process.argv[2];

if (action === 'migrate') {
  migrateServices();
} else if (action === 'rollback') {
  rollbackServices();
} else {
  console.log(`
Usage: node migrate-services.js [action]

Actions disponibles:
  migrate  - Migrer vers les nouveaux services MongoDB
  rollback - Restaurer les anciens services

Exemple:
  node migrate-services.js migrate
  node migrate-services.js rollback
  `);
}