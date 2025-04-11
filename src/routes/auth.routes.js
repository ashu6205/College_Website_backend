const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authController = require('../controllers/auth.controller');
const passport = require('passport');
const auth = require('../middleware/auth.middleware');

// Register route
// Register route (updated: department & batch optional)
router.post('/register', [
    check('email', 'Please include a valid IIITG email').matches(/^[\w-\.]+@iiitg\.ac\.in$/),
    check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
    check('fullName', 'Full name is required').not().isEmpty(),
    check('department', 'Invalid department').optional().isString(),
    check('batch', 'Invalid batch').optional().isString()
], authController.register);


// Login route (Traditional)
router.post('/login', [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
], authController.login);

// Google OAuth route
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback route
router.get('/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: '/login' }), 
    authController.googleLoginCallback
);

// Get profile route
router.get('/profile', auth, authController.getProfile);
router.get('/users', auth, authController.getAllUsers);

// Update profile route
router.put('/profile', auth, authController.updateProfile);

 


module.exports = router;
