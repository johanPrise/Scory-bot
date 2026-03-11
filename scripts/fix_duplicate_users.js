/**
 * Script de diagnostic et correction des doublons User
 * 
 * Ce script :
 * 1. Détecte les comptes User dupliqués (même telegram.id)
 * 2. Affiche quel ObjectId est dans les ChatGroups et quel ObjectId est utilisé par l'API
 * 3. Corrige automatiquement les doublons (garde le plus ancien, fusionne les données)
 * 
 * Usage : node --env-file=.env scripts/fix_duplicate_users.js
 *    ou : node -r dotenv/config scripts/fix_duplicate_users.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/api/models/User.js';
import ChatGroup from '../src/api/models/ChatGroup.js';
import Score from '../src/api/models/Score.js';
import Team from '../src/api/models/Team.js';

dotenv.config({ path: '.env' });

async function diagnoseAndFix() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connecté à MongoDB\n');

    // ===== ÉTAPE 1 : Trouver les telegram.id dupliqués =====
    console.log('═══════════════════════════════════════════');
    console.log('  ÉTAPE 1 : Recherche des doublons User');
    console.log('═══════════════════════════════════════════\n');

    const pipeline = [
      { $match: { 'telegram.id': { $exists: true, $ne: null, $ne: '' } } },
      { $group: { _id: '$telegram.id', count: { $sum: 1 }, users: { $push: { id: '$_id', username: '$username', createdAt: '$createdAt' } } } },
      { $match: { count: { $gt: 1 } } }
    ];

    const duplicates = await User.aggregate(pipeline);

    if (duplicates.length === 0) {
      console.log('✅ Aucun doublon User trouvé.\n');
    } else {
      console.log(`⚠️  ${duplicates.length} telegram.id avec des comptes dupliqués :\n`);
      for (const dup of duplicates) {
        console.log(`  telegram.id = ${dup._id} (${dup.count} comptes) :`);
        for (const u of dup.users) {
          console.log(`    - _id: ${u.id}  username: ${u.username}  créé: ${u.createdAt}`);
        }
      }
      console.log('');
    }

    // ===== ÉTAPE 2 : Afficher l'état des ChatGroups =====
    console.log('═══════════════════════════════════════════');
    console.log('  ÉTAPE 2 : État des ChatGroups');
    console.log('═══════════════════════════════════════════\n');

    const allGroups = await ChatGroup.find({ isActive: true });
    console.log(`📋 ${allGroups.length} groupe(s) actif(s) trouvé(s)\n`);

    for (const group of allGroups) {
      console.log(`  Groupe : "${group.title}" (chatId: ${group.chatId})`);
      console.log(`  Membres (${group.members.length}) :`);
      for (const m of group.members) {
        const user = await User.findById(m.userId);
        const status = user ? `✅ ${user.username}` : '❌ USER INTROUVABLE';
        console.log(`    - userId: ${m.userId} | telegramId: ${m.telegramId || 'MANQUANT'} | ${status}`);
      }
      console.log('');
    }

    // ===== ÉTAPE 3 : Tester getUserGroups pour chaque user Telegram =====
    console.log('═══════════════════════════════════════════');
    console.log('  ÉTAPE 3 : Test getUserGroups par user');
    console.log('═══════════════════════════════════════════\n');

    const telegramUsers = await User.find({ 'telegram.id': { $exists: true, $ne: null, $ne: '' } });
    
    for (const user of telegramUsers) {
      const telegramId = user.telegram.id;
      
      // Test par ObjectId (ancien mode)
      const byObjectId = await ChatGroup.find({
        'members.userId': user._id, isActive: true
      });
      
      // Test par telegramId (nouveau mode)
      const byTelegramId = await ChatGroup.find({
        'members.telegramId': telegramId, isActive: true
      });

      const icon = byObjectId.length > 0 || byTelegramId.length > 0 ? '👤' : '👻';
      console.log(`  ${icon} ${user.username} (_id: ${user._id}, tg: ${telegramId})`);
      console.log(`     Par ObjectId  : ${byObjectId.length} groupe(s)  [${byObjectId.map(g => g.title).join(', ')}]`);
      console.log(`     Par telegramId: ${byTelegramId.length} groupe(s)  [${byTelegramId.map(g => g.title).join(', ')}]`);
      
      if (byObjectId.length === 0 && byTelegramId.length > 0) {
        console.log(`     ⚠️  PROBLÈME : ObjectId ${user._id} ne matche aucun groupe, mais telegramId ${telegramId} en trouve ${byTelegramId.length}`);
      }
      console.log('');
    }

    // ===== ÉTAPE 4 : Correction automatique des doublons =====
    if (duplicates.length > 0) {
      console.log('═══════════════════════════════════════════');
      console.log('  ÉTAPE 4 : Correction des doublons');
      console.log('═══════════════════════════════════════════\n');

      for (const dup of duplicates) {
        const telegramId = dup._id;
        const allUsers = await User.find({ 'telegram.id': telegramId }).sort({ createdAt: 1 });
        
        const keeper = allUsers[0]; // le plus ancien
        const toRemove = allUsers.slice(1);
        const removeIds = toRemove.map(u => u._id);

        console.log(`  🔧 Fusion pour telegram.id=${telegramId}`);
        console.log(`     Garder   : ${keeper._id} (${keeper.username})`);
        console.log(`     Supprimer: ${removeIds.map(id => id.toString()).join(', ')}`);

        // Transférer scores
        const scoreResult = await Score.updateMany(
          { user: { $in: removeIds } },
          { $set: { user: keeper._id } }
        );
        console.log(`     Scores transférés: ${scoreResult.modifiedCount}`);

        // Transférer teams
        const teamResult = await Team.updateMany(
          { 'members.user': { $in: removeIds } },
          { $set: { 'members.$.user': keeper._id } }
        );
        console.log(`     Teams transférés: ${teamResult.modifiedCount}`);

        // Corriger les ChatGroups
        const groupResult = await ChatGroup.updateMany(
          { 'members.userId': { $in: removeIds } },
          { $set: { 'members.$.userId': keeper._id } }
        );
        console.log(`     Groups corrigés: ${groupResult.modifiedCount}`);

        // Supprimer les doublons
        const deleteResult = await User.deleteMany({ _id: { $in: removeIds } });
        console.log(`     Users supprimés: ${deleteResult.deletedCount}`);
        console.log('');
      }
    }

    // ===== ÉTAPE 5 : Vérification post-correction =====
    console.log('═══════════════════════════════════════════');
    console.log('  VÉRIFICATION FINALE');
    console.log('═══════════════════════════════════════════\n');

    const remainingDups = await User.aggregate(pipeline);
    if (remainingDups.length === 0) {
      console.log('✅ Plus aucun doublon User.\n');
    } else {
      console.log(`❌ Il reste ${remainingDups.length} telegram.id avec des doublons.\n`);
    }

    // Re-tester getUserGroups
    const finalUsers = await User.find({ 'telegram.id': { $exists: true, $ne: null, $ne: '' } });
    for (const user of finalUsers) {
      const groups = await ChatGroup.getUserGroups(user._id, user.telegram.id);
      console.log(`  ${user.username} (tg: ${user.telegram.id}) → ${groups.length} groupe(s)`);
    }

    console.log('\n✅ Diagnostic terminé.');
  } catch (err) {
    console.error('❌ Erreur:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

diagnoseAndFix();
