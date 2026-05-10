import Score from '../../models/Score.js';
import logger from '../../../utils/logger.js';
import { handleScoreError } from './errors.js';
import { toObjectId } from './objectId.js';

const ALLOWED_SCORE_UPDATES = new Set(['value', 'maxPossible', 'status', 'comments', 'rejectionReason']);

const getInvalidUpdates = (updates) => {
  return Object.keys(updates).filter(key => !ALLOWED_SCORE_UPDATES.has(key));
};

const getUpdateKeys = (updates) => Object.keys(updates || {});

const assertScoreId = (scoreId) => {
  if (!scoreId) {
    throw new Error('ID du score manquant');
  }
};

const assertValidUpdatesObject = (updates) => {
  if (!updates || typeof updates !== 'object') {
    throw new Error('Mises à jour invalides');
  }
};

const assertAllowedUpdates = (updates) => {
  const invalidUpdates = getInvalidUpdates(updates);
  if (invalidUpdates.length > 0) {
    throw new Error(`Mises à jour non autorisées: ${invalidUpdates.join(', ')}`);
  }
};

const validateUpdateRequest = ({ scoreId, updates }) => {
  assertScoreId(scoreId);
  assertValidUpdatesObject(updates);
  assertAllowedUpdates(updates);
};

const findScoreById = async (scoreId) => {
  const score = await Score.findById(toObjectId(scoreId));
  if (!score) throw new Error('Score non trouvé');
  return score;
};

const applyReviewDate = (score, updates) => {
  if (updates.status) {
    score.reviewedAt = new Date();
  }
};

const applyScoreUpdates = (score, updates) => {
  Object.assign(score, updates);
  applyReviewDate(score, updates);
};

/**
 * Met à jour un score existant
 */
export const updateScore = async (scoreId, updates) => {
  try {
    validateUpdateRequest({ scoreId, updates });
    const score = await findScoreById(scoreId);
    applyScoreUpdates(score, updates);
    await score.save();

    logger.info(`Score ${scoreId} mis à jour`, { updates: getUpdateKeys(updates) });
    return score;
  } catch (error) {
    return handleScoreError(
      error,
      `Erreur lors de la mise à jour du score ${scoreId}`,
      { scoreId, updates: getUpdateKeys(updates) }
    );
  }
};
