const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

// Register (Traditional)
exports.register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, fullName, department, batch } = req.body;

        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const role = batch ? 'student' : 'faculty';

        user = new User({
            email,
            password,
            fullName,
            department: department || null,
            batch: batch || null,
            role
        });

        await user.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


 

// Login (Traditional)
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.json({
            token,
            user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Google OAuth Login Callback
 

exports.googleLoginCallback = async (req, res) => {
    try {
        console.log("Google Login Callback:", req.user); // Log the user object for debugging
        

        const { _id, email } = req.user; // Extract Google ID & email
        const id = req.user.googleId; // Use the Google ID from the user object
        console.log("User ID:", _id); // Log the user ID for debugging
        console.log("Google ID:", id);
        console.log("Email:", email);

        if (!email.endsWith("@iiitg.ac.in")) {
            return res.status(400).json({ message: "Only IIITG emails allowed" });
        }

        let user = await User.findOne({ email });

        if (!user) {
            user = new User({
                email,
                googleId: id // Store Google ID instead of password
            });
            await user.save();
        }

        // Generate JWT token or session (depends on your auth logic)
        res.status(200).json({ message: "Login successful", user });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong", error });
    }
};


// Get Profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password').lean();
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        res.json({ success: true, user });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get All Users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password').lean();

        res.json({ success: true, users });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ success: false, message: 'Error fetching users' });
    }
};

// Update Profile
exports.updateProfile = async (req, res) => {
    try {
        const { fullName, department, batch, bio } = req.body;

        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (fullName) user.fullName = fullName;
        if (department) user.department = department;
        if (batch) user.batch = batch;
        if (bio) user.bio = bio;

        await user.save();

        res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

 

