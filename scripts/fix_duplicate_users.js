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

async function findDuplicates() {
  const pipeline = [
    { $match: { 'telegram.id': { $exists: true, $nin: [null, ''] } } },
    { $group: { _id: '$telegram.id', count: { $sum: 1 }, users: { $push: { id: '$_id', username: '$username', createdAt: '$createdAt' } } } },
    { $match: { count: { $gt: 1 } } }
  ];
  return User.aggregate(pipeline);
}

function displayDuplicates(duplicates) {
  console.log('═══════════════════════════════════════════');
  console.log('  ÉTAPE 1 : Recherche des doublons User');
  console.log('═══════════════════════════════════════════\n');

  if (duplicates.length === 0) {
    console.log('✅ Aucun doublon User trouvé.\n');
    return;
  }

  console.log(`⚠️  ${duplicates.length} telegram.id avec des comptes dupliqués :\n`);
  for (const dup of duplicates) {
    console.log(`  telegram.id = ${dup._id} (${dup.count} comptes) :`);
    for (const u of dup.users) {
      console.log(`    - _id: ${u.id}  username: ${u.username}  créé: ${u.createdAt}`);
    }
  }
  console.log('');
}

async function checkChatGroups() {
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
}

async function testUserGroups() {
  console.log('═══════════════════════════════════════════');
  console.log('  ÉTAPE 3 : Test getUserGroups par user');
  console.log('═══════════════════════════════════════════\n');

  const telegramUsers = await User.find({ 'telegram.id': { $exists: true, $nin: [null, ''] } });

  for (const user of telegramUsers) {
    const telegramId = user.telegram.id;
    const byObjectId = await ChatGroup.find({ 'members.userId': user._id, isActive: true });
    const byTelegramId = await ChatGroup.find({ 'members.telegramId': telegramId, isActive: true });

    const icon = byObjectId.length > 0 || byTelegramId.length > 0 ? '👤' : '👻';
    console.log(`  ${icon} ${user.username} (_id: ${user._id}, tg: ${telegramId})`);
    console.log(`     Par ObjectId  : ${byObjectId.length} groupe(s)  [${byObjectId.map(g => g.title).join(', ')}]`);
    console.log(`     Par telegramId: ${byTelegramId.length} groupe(s)  [${byTelegramId.map(g => g.title).join(', ')}]`);

    if (byObjectId.length === 0 && byTelegramId.length > 0) {
      console.log(`     ⚠️  PROBLÈME : ObjectId ${user._id} ne matche aucun groupe, mais telegramId ${telegramId} en trouve ${byTelegramId.length}`);
    }
    console.log('');
  }
}

async function fixDuplicate(dup, keeper, removeIds) {
  const scoreResult = await Score.updateMany({ user: { $in: removeIds } }, { $set: { user: keeper._id } });
  console.log(`     Scores transférés: ${scoreResult.modifiedCount}`);

  const teamResult = await Team.updateMany({ 'members.user': { $in: removeIds } }, { $set: { 'members.$.user': keeper._id } });
  console.log(`     Teams transférés: ${teamResult.modifiedCount}`);

  const groupResult = await ChatGroup.updateMany({ 'members.userId': { $in: removeIds } }, { $set: { 'members.$.userId': keeper._id } });
  console.log(`     Groups corrigés: ${groupResult.modifiedCount}`);

  const deleteResult = await User.deleteMany({ _id: { $in: removeIds } });
  console.log(`     Users supprimés: ${deleteResult.deletedCount}`);
}

async function fixDuplicates(duplicates) {
  console.log('═══════════════════════════════════════════');
  console.log('  ÉTAPE 4 : Correction des doublons');
  console.log('═══════════════════════════════════════════\n');

  for (const dup of duplicates) {
    const allUsers = await User.find({ 'telegram.id': dup._id }).sort({ createdAt: 1 });
    const keeper = allUsers[0];
    const removeIds = allUsers.slice(1).map(u => u._id);

    console.log(`  🔧 Fusion pour telegram.id=${dup._id}`);
    console.log(`     Garder   : ${keeper._id} (${keeper.username})`);
    console.log(`     Supprimer: ${removeIds.map(id => id.toString()).join(', ')}`);

    await fixDuplicate(dup, keeper, removeIds);
    console.log('');
  }
}

async function verifyFix(pipeline) {
  console.log('═══════════════════════════════════════════');
  console.log('  VÉRIFICATION FINALE');
  console.log('═══════════════════════════════════════════\n');

  const remainingDups = await User.aggregate(pipeline);
  if (remainingDups.length === 0) {
    console.log('✅ Plus aucun doublon User.\n');
  } else {
    console.log(`❌ Il reste ${remainingDups.length} telegram.id avec des doublons.\n`);
  }

  const finalUsers = await User.find({ 'telegram.id': { $exists: true, $nin: [null, ''] } });
  for (const user of finalUsers) {
    const groups = await ChatGroup.getUserGroups(user._id, user.telegram.id);
    console.log(`  ${user.username} (tg: ${user.telegram.id}) → ${groups.length} groupe(s)`);
  }

  console.log('\n✅ Diagnostic terminé.');
}

async function diagnoseAndFix() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connecté à MongoDB\n');

    const duplicates = await findDuplicates();
    displayDuplicates(duplicates);
    await checkChatGroups();
    await testUserGroups();

    if (duplicates.length > 0) {
      await fixDuplicates(duplicates);
    }

    const pipeline = [
      { $match: { 'telegram.id': { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$telegram.id', count: { $sum: 1 }, users: { $push: { id: '$_id', username: '$username', createdAt: '$createdAt' } } } },
      { $match: { count: { $gt: 1 } } }
    ];
    await verifyFix(pipeline);
  } catch (err) {
    console.error('❌ Erreur:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

await diagnoseAndFix();
