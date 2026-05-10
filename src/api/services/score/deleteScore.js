import mongoose from 'mongoose';
import Score from '../../models/Score.js';
import User from '../../models/User.js';
import Team from '../../models/Team.js';
import logger from '../../../utils/logger.js';
import { handleScoreError } from './errors.js';
import { toObjectId } from './objectId.js';

const subtractUserScore = async ({ targetId, value, session }) => {
  const user = await User.findById(targetId).session(session);
  await user?.updateScore(-value, null);
};

const subtractTeamScore = async ({ targetId, value, session }) => {
  const team = await Team.findById(targetId).session(session);
  await team?.updateScore(-value);
};

const SCORE_TARGET_UPDATERS = [
  { idKey: 'user', update: subtractUserScore },
  { idKey: 'team', update: subtractTeamScore }
];

const buildScoreTargetUpdates = (score) => {
  return SCORE_TARGET_UPDATERS
    .filter(({ idKey }) => score[idKey])
    .map(({ idKey, update }) => ({
      update,
      targetId: score[idKey],
      value: score.value
    }));
};

const applyScoreTargetUpdates = async ({ updates, session }) => {
  for (const { update, targetId, value } of updates) {
    await update({ targetId, value, session });
  }
};

const removeApprovedScoreFromTarget = async ({ score, session }) => {
  if (score.status !== 'approved') return;

  await applyScoreTargetUpdates({
    updates: buildScoreTargetUpdates(score),
    session
  });
};

const deleteScoreWithStatistics = async (score) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await removeApprovedScoreFromTarget({ score, session });
    await Score.findByIdAndDelete(score._id).session(session);
    await session.commitTransaction();
  } catch (txError) {
    await session.abortTransaction();
    throw txError;
  } finally {
    session.endSession();
  }
};

/**
 * Supprime un score
 */
export const deleteScore = async (scoreId, deletedBy) => {
  try {
    if (!scoreId || !deletedBy) {
      throw new Error('ID du score ou de l\'utilisateur manquant');
    }

    const score = await Score.findById(toObjectId(scoreId));
    if (!score) throw new Error('Score non trouvé');

    await deleteScoreWithStatistics(score);

    logger.info(`Score ${scoreId} supprimé par ${deletedBy}`);
    return true;
  } catch (error) {
    return handleScoreError(
      error,
      `Erreur lors de la suppression du score ${scoreId}`,
      { scoreId, deletedBy }
    );
  }
};
