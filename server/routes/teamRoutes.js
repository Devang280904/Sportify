const express = require('express');
const router = express.Router();
const {
  createTeam, getTeam, getTeams, addPlayer, removePlayer, deleteTeam, uploadPlayers,
  getMyTeams, linkTeam, unlinkTeam
} = require('../controllers/teamController');
const { protect } = require('../middlewares/auth');

router.get('/my-teams', protect, getMyTeams);
router.post('/link', protect, linkTeam);

router.route('/')
  .get(protect, getTeams)
  .post(protect, createTeam);

router.route('/:id')
  .get(protect, getTeam)
  .delete(protect, deleteTeam);

router.post('/:id/unlink', protect, unlinkTeam);

router.route('/:id/players')
  .post(protect, addPlayer);

router.route('/:id/players/upload')
  .post(protect, uploadPlayers);

router.route('/:id/players/:playerId')
  .delete(protect, removePlayer);

module.exports = router;
