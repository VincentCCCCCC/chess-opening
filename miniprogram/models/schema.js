const SCHEMA_VERSION = 1;
const SAMPLE_FEN_AFTER_D4_D5 = 'rn1qkbnr/pppbpppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2';
const STANDARD_INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * @typedef {'white' | 'black'} ChessSide
 * @typedef {'q' | 'r' | 'b' | 'n'} PromotionPiece
 * @typedef {'perfect' | 'completed_with_errors' | 'abandoned'} PracticeResultStatus
 */

/**
 * @typedef {Object} RecordedMove
 * @property {number} ply
 * @property {ChessSide} side
 * @property {string} from
 * @property {string} to
 * @property {PromotionPiece=} promotion
 * @property {string} san
 * @property {string} fenAfter
 */

/**
 * @typedef {Object} VariationStats
 * @property {number} practiceCount
 * @property {number} perfectCount
 * @property {number} streakPerfect
 * @property {number=} lastPracticedAt
 * @property {PracticeResultStatus=} lastResult
 * @property {number=} lastMistakePly
 */

/**
 * @typedef {Object} Opening
 * @property {string} id
 * @property {string} name
 * @property {ChessSide} practiceSide
 * @property {string[]} tags
 * @property {string} color
 * @property {number} createdAt
 * @property {number} updatedAt
 * @property {number=} lastPracticedAt
 */

/**
 * @typedef {Object} Variation
 * @property {string} id
 * @property {string} openingId
 * @property {string} name
 * @property {string} notes
 * @property {string} initialFen
 * @property {RecordedMove[]} moves
 * @property {number} plyCount
 * @property {VariationStats} stats
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * @typedef {Object} PracticeMistake
 * @property {string} variationId
 * @property {number} ply
 * @property {string} expectedFrom
 * @property {string} expectedTo
 * @property {string} actualFrom
 * @property {string} actualTo
 * @property {number} createdAt
 */

/**
 * @typedef {Object} PracticeVariationResult
 * @property {string} variationId
 * @property {PracticeResultStatus} status
 * @property {number} mistakeCount
 * @property {number} durationMs
 * @property {PracticeMistake[]} mistakes
 */

/**
 * @typedef {Object} PracticeSession
 * @property {string} id
 * @property {string} openingId
 * @property {'single' | 'sequential' | 'random'} mode
 * @property {string[]} variationIds
 * @property {PracticeVariationResult[]} results
 * @property {number} startedAt
 * @property {number=} completedAt
 */

/**
 * @typedef {Object} AppSettings
 * @property {boolean} enableHaptics
 * @property {ChessSide} defaultPracticeSide
 */

/**
 * @typedef {Object} AppData
 * @property {number} schemaVersion
 * @property {Opening[]} openings
 * @property {Variation[]} variations
 * @property {PracticeSession[]} practiceSessions
 * @property {AppSettings} settings
 * @property {number} createdAt
 * @property {number} updatedAt
 */

function createDefaultVariationStats() {
  return {
    practiceCount: 0,
    perfectCount: 0,
    streakPerfect: 0,
  };
}

function createDefaultAppData(now) {
  const timestamp = now || Date.now();
  return {
    schemaVersion: SCHEMA_VERSION,
    openings: [],
    variations: [],
    practiceSessions: [],
    settings: {
      enableHaptics: true,
      defaultPracticeSide: 'white',
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

module.exports = {
  SCHEMA_VERSION,
  INITIAL_FEN: STANDARD_INITIAL_FEN,
  STANDARD_INITIAL_FEN,
  SAMPLE_FEN_AFTER_D4_D5,
  createDefaultAppData,
  createDefaultVariationStats,
};
