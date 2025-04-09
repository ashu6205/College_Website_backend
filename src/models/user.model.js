const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^[\w-\.]+@iiitg\.ac\.in$/, 'Please use IIITG email address']
    },
    password: {
        type: String,
        minlength: 6,
        required: function() { return !this.googleId; }  // Password required only for non-Google users
    },
    googleId: {
        type: String,  // Store Google’s unique user ID
        unique: true,
        sparse: true  // Allows some users to have this field while others don’t
    },
    
    fullName: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['student', 'faculty', 'admin'],
        default: 'student'
    },
    profilePicture: {
        type: String,
        default: ''
    },
    department: String,
    batch: String,
    bio: {
        type: String,
        maxlength: 200
    },
    points: {
        type: Number,
        default: 0
    },
    badges: [{
        type: String
    }],
    isVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Hash password before saving (only if password exists)
userSchema.pre('save', async function(next) {
    if (!this.isModified('password') || !this.password) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
