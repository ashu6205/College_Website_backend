const mongoose = require('mongoose');

const lostFoundSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['lost', 'found'],
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['electronics', 'documents', 'accessories', 'books', 'others'],
        required: true
    },
    location: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    images: {
        type: [String], // Change this from [{type: String}] to {type: [String]}
        default: []
    },
    status: {
        type: String,
        enum: ['open', 'claimed', 'resolved', 'closed'],
        default: 'open'
    },
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    claims: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        message: String,
        proofImage: String,
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    contactInfo: {
        email: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        preferredContact: {
            type: String,
            enum: ['email', 'phone', 'both'],
            default: 'email'
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('LostFound', lostFoundSchema);