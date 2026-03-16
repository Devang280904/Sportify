const express = require('express');
const router = express.Router();
const {
  updateScore, undoLastBall, completeMatch, getPointsTable,
} = require('../controllers/scoreController');
const { protect, authorize } = require('../middlewares/auth');

router.post('/:id/score', protect, authorize('organizer', 'admin'), updateScore);
router.post('/:id/undo', protect, authorize('organizer', 'admin'), undoLastBall);
router.post('/:id/complete', protect, authorize('organizer', 'admin'), completeMatch);

// Points table is under tournaments route but handled here
// Mounted separately in server.js if needed, or via tournament routes
module.exports = router;
