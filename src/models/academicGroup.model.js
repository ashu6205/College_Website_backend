// src/models/academic.group.model.js
const mongoose = require('mongoose');

const academicGroupSchema = new mongoose.Schema({
    batchYear: {
        type: String,
        required: true
    },
    department: {
        type: String,
        enum: ['CSE', 'ECE'],
        required: true
    },
    semester: {
        type: Number,
        min: 1,
        max: 8,
        required: true
    },
    courseCode: {
        type: String,
        required: true,
        uppercase: true
    },
    courseTitle: {
        type: String,
        required: true
    },
    faculty: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    classRepresentatives: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AcademicGroup', academicGroupSchema);