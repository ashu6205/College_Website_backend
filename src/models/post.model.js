const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    media: [{
        filename: String,
        originalName: String,
        path: String,
        fileType: String, // 'image', 'document', 'video'
        mimeType: String
    }],
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel'
    },
    isAnonymous: {
        type: Boolean,
        default: false
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        content: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    tags: [String],
    visibility: {
        type: String,
        enum: ['public', 'private', 'channel'],
        default: 'public'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Post', postSchema);