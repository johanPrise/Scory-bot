export { addScore } from './score/addScore.js';
export { updateScore } from './score/updateScore.js';
export { deleteScore } from './score/deleteScore.js';
export { getRankings, getRankings as getRankingData } from './score/rankings.js';
export { getScoreHistory } from './score/history.js';
export { getDashboardData } from './score/dashboard.js';

export { SCORE_STATUS, SCORE_TYPES, STATS_PERIODS } from './score/constants.js';

import { addScore } from './score/addScore.js';
import { updateScore } from './score/updateScore.js';
import { deleteScore } from './score/deleteScore.js';
import { getRankings } from './score/rankings.js';
import { getScoreHistory } from './score/history.js';
import { getDashboardData } from './score/dashboard.js';

const scoreService = {
  addScore,
  updateScore,
  deleteScore,
  getRankings,
  getRankingData: getRankings,
  getScoreHistory,
  getDashboardData
};

export default scoreService;
