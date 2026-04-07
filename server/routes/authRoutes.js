const express = require('express');
const router = express.Router();
const { signup, login, getMe, forgotPassword, resetPassword, logout } = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const { loginLimiter } = require('../middlewares/rateLimiter');

router.post('/signup', signup);
router.post('/login', loginLimiter, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;

