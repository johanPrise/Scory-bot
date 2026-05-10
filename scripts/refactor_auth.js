import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, '../src/api/routes/auth.js');
let code = fs.readFileSync(file, 'utf8');

const regex = / {4}\/\/ Transférer les éventuelles données des doublons vers le compte principal[\s\S]*?\} catch \(mergeErr\) \{[\s\S]*?Continuer malgré l'erreur de fusion\n {4}\}/;

const safeBlock = `    // Transférer les éventuelles données des doublons vers le compte principal
    // (scores, teams, etc. qui référencent les doublons)
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const Score = (await import('../models/Score.js')).default;
      const Team = (await import('../models/Team.js')).default;
      const ChatGroup = (await import('../models/ChatGroup.js')).default;

      await Score.updateMany({ user: { $in: duplicateIds } }, { $set: { user: user._id } }, { session });
      await Team.updateMany({ 'members.user': { $in: duplicateIds } }, { $set: { 'members.$.user': user._id } }, { session });
      await ChatGroup.updateMany(
        { 'members.userId': { $in: duplicateIds } },
        { $set: { 'members.$.userId': user._id } },
        { session }
      );

      // Supprimer les doublons
      await User.deleteMany({ _id: { $in: duplicateIds } }, { session });
      await session.commitTransaction();
      logger.info(\`Doublons supprimés et données transférées vers \${user._id}\`);
    } catch (mergeErr) {
      await session.abortTransaction();
      logger.error('Erreur lors de la fusion des doublons:', mergeErr.message);
      // Continuer malgré l'erreur de fusion
    } finally {
      session.endSession();
    }`;

code = code.replace(regex, safeBlock);
fs.writeFileSync(file, code);
console.log('Done refactoring auth');
