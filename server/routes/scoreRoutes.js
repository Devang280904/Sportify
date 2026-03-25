const express = require('express');
const router = express.Router();
const {
  updateScore, undoLastBall, completeMatch,
  setBatsmen, setBowler, swapInnings,
} = require('../controllers/scoreController');
const { protect, isMatchOwner } = require('../middlewares/auth');

router.post('/:id/score', protect, isMatchOwner, updateScore);
router.post('/:id/undo', protect, isMatchOwner, undoLastBall);
router.post('/:id/complete', protect, isMatchOwner, completeMatch);
router.post('/:id/set-batsmen', protect, isMatchOwner, setBatsmen);
router.post('/:id/set-bowler', protect, isMatchOwner, setBowler);
router.post('/:id/swap-innings', protect, isMatchOwner, swapInnings);

module.exports = router;
