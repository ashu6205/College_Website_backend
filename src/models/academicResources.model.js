const mongoose = require('mongoose');

const academicResourceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['notes', 'slides', 'assignment', 'announcement'],
        required: true
    },
    subject: {
        name: String,
        code: String
    },
    description: String,
    files: [{
        filename: String,
        originalName: String,
        path: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    academicGroup: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicGroup',
        required: true
    },
    uploader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isAnnouncement: {
        type: Boolean,
        default: false
    },
    deadline: Date // for assignments
}, {
    timestamps: true
});

module.exports = mongoose.model('AcademicResource', academicResourceSchema);