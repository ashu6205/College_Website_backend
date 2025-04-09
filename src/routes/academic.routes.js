const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const academicController = require('../controllers/academic.controller');

// Test route
router.get('/test', (req, res) => {
    console.log('Test route accessed');
    res.json({ message: 'Academic routes working' });
});

// Basic Group Management
router.get('/groups', auth, academicController.getAcademicGroups);
router.post('/groups', auth, academicController.createAcademicGroup);

// Resource Management
router.post('/resources', 
    auth, 
    upload.array('files', 5),
    academicController.uploadResource
);

router.get('/groups/:groupId/resources', 
    auth, 
    academicController.getGroupResources
);

// Announcements
router.post('/groups/:groupId/announcements', 
    auth, 
    academicController.makeAnnouncement
);

router.get('/resources/:resourceId', 
    auth, 
    academicController.getResourceById
);

router.delete('/resources/:resourceId', 
    auth, 
    academicController.deleteResource
);

// backend/routes/academic.routes.js
router.post('/groups/:groupId/students', auth, academicController.addStudents);


router.post('/groups/:groupId/cr', auth, academicController.addCR);
router.post('/groups/:groupId/faculty', auth, academicController.addFaculty);
router.get('/groups/:groupId', auth, academicController.getGroupDetails);


router.get('/resources/search', auth, academicController.getFilteredResources);
router.get('/groups/:groupId/stats', auth, academicController.getResourceStats);
router.get('/groups/:groupId/subjects/:subjectCode', auth, academicController.getSubjectResources);

module.exports = router;