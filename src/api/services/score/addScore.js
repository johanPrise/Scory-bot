import mongoose from 'mongoose';
import Score from '../../models/Score.js';
import { Activity } from '../../models/activity.js';
import User from '../../models/User.js';
import Team from '../../models/Team.js';
import logger from '../../../utils/logger.js';
import { SCORE_STATUS, SCORE_TYPES } from './constants.js';
import { handleScoreError } from './errors.js';
import { toObjectId } from './objectId.js';

const REQUIRED_SCORE_FIELDS = ['type', 'entityId', 'activityId', 'value'];

const validateRequiredScoreFields = (scoreData) => {
  const missingFields = REQUIRED_SCORE_FIELDS.filter(field => !(field in scoreData));
  if (missingFields.length > 0) {
    throw new Error(`Champs manquants: ${missingFields.join(', ')}`);
  }
};

const validateScoreType = (type) => {
  if (!Object.values(SCORE_TYPES).includes(type)) {
    throw new Error(`Type de score invalide. Doit être l'un des suivants: ${Object.values(SCORE_TYPES).join(', ')}`);
  }
};

const validateScoreInput = (scoreData) => {
  validateRequiredScoreFields(scoreData);
  validateScoreType(scoreData.type);
};

const assertActivityExists = async (activityId) => {
  const activityObjId = toObjectId(activityId);
  const activity = await Activity.findById(activityObjId);
  if (!activity) {
    throw new Error('Activité non trouvée');
  }
  return activityObjId;
};

const resolveIndividualTarget = async (entityId) => {
  const userId = toObjectId(entityId);
  const user = await User.findById(userId);
  if (!user) throw new Error('Utilisateur non trouvé');

  return { context: 'individual', userId, user };
};

const resolveTeamTarget = async (entityId) => {
  const teamId = toObjectId(entityId);
  const team = await Team.findById(teamId);
  if (!team) throw new Error('Équipe non trouvée');

  return { context: 'team', teamId, team };
};

const resolveScoreTarget = async (scoreData) => {
  if (scoreData.type === SCORE_TYPES.INDIVIDUAL) {
    return resolveIndividualTarget(scoreData.entityId);
  }

  if (scoreData.type === SCORE_TYPES.TEAM) {
    return resolveTeamTarget(scoreData.entityId);
  }

  return {};
};

const findDuplicateScore = ({ userId, teamId, activityObjId, subActivityId }) => {
  return Score.findOne({
    ...(userId && { user: userId }),
    ...(teamId && { team: teamId }),
    activity: activityObjId,
    ...(subActivityId && { subActivity: toObjectId(subActivityId) })
  });
};

const assertNoDuplicateScore = async (scoreData, target, activityObjId) => {
  const existingScore = await findDuplicateScore({
    userId: target.userId,
    teamId: target.teamId,
    activityObjId,
    subActivityId: scoreData.subActivityId
  });

  if (existingScore) {
    throw new Error('Un score existe déjà pour cette combinaison');
  }
};

const buildScoreDocument = (scoreData, target, activityObjId) => {
  return new Score({
    user: target.userId,
    team: target.teamId,
    activity: activityObjId,
    subActivity: scoreData.subActivityId,
    value: scoreData.value,
    maxPossible: scoreData.maxPossible || 100,
    context: target.context,
    awardedBy: scoreData.awardedBy,
    status: scoreData.status || SCORE_STATUS.APPROVED,
    metadata: {
      chatId: scoreData.chatId,
      messageId: scoreData.messageId,
      comments: scoreData.comments,
      evidence: scoreData.proofUrl
    }
  });
};

const updateTargetStatistics = async ({ target, value, activityObjId, session }) => {
  if (target.user) {
    target.user.$session(session);
    await target.user.updateScore(value, activityObjId);
  }

  if (target.team) {
    target.team.$session(session);
    await target.team.updateScore(value);
  }
};

const saveScoreWithStatistics = async ({ scoreData, target, activityObjId }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const score = buildScoreDocument(scoreData, target, activityObjId);
    await score.save({ session });
    await updateTargetStatistics({ target, value: scoreData.value, activityObjId, session });
    await session.commitTransaction();
    return score;
  } catch (txError) {
    await session.abortTransaction();
    throw txError;
  } finally {
    session.endSession();
  }
};

/**
 * Ajoute un nouveau score (individuel ou d'équipe)
 */
export const addScore = async (scoreData) => {
  try {
    validateScoreInput(scoreData);

    const activityObjId = await assertActivityExists(scoreData.activityId);
    const target = await resolveScoreTarget(scoreData);
    await assertNoDuplicateScore(scoreData, target, activityObjId);

    const score = await saveScoreWithStatistics({ scoreData, target, activityObjId });

    logger.info(`Nouveau score ajouté: ${scoreData.value} points pour ${scoreData.type} ${scoreData.entityId}`);
    return score;
  } catch (error) {
    return handleScoreError(
      error,
      'Erreur lors de l\'ajout du score',
      { type: scoreData?.type, entityId: scoreData?.entityId, activityId: scoreData?.activityId }
    );
  }
};
