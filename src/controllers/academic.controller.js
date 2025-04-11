const AcademicGroup = require('../models/academicGroup.model');
const AcademicResource = require('../models/academicResources.model');
const User = require('../models/user.model'); 

// Create academic group
 
// controllers/academic.controller.js

exports.createAcademicGroup = async (req, res) => {
    try {
        const { 
            batchYear, 
            department, 
            semester, 
            courseCode, 
            courseTitle,
            faculty,
            classRepresentatives 
        } = req.body;

        console.log('Received data:', req.body);

        if (!courseCode || !courseTitle) {
            return res.status(400).json({
                success: false,
                message: 'Course code and title are required'
            });
        }

        // Ensure classRepresentatives is an array
        const crs = Array.isArray(classRepresentatives) ? classRepresentatives : [];

        // Get creator ID from auth middleware (assumed attached to req.user)
        const creatorId = req.user._id;

        // Add creator + CRs into a Set to avoid duplicates
        const studentSet = new Set([...crs.map(id => id.toString()), creatorId.toString()]);
        const uniqueStudents = Array.from(studentSet);

        // Create the group
        const group = new AcademicGroup({
            batchYear,
            department,
            semester,
            courseCode: courseCode.toUpperCase(),
            courseTitle,
            faculty: faculty || [],
            classRepresentatives: crs,
            students: uniqueStudents
        });

        await group.save();

        // Fetch and return populated version
        const populatedGroup = await AcademicGroup.findById(group._id)
            .populate('faculty', 'fullName email')
            .populate('classRepresentatives', 'fullName email')
            .populate('students', 'fullName email');

        res.status(201).json({
            success: true,
            message: 'Academic group created successfully',
            group: populatedGroup
        });

    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating academic group'
        });
    }
};

 


// In your academic.controller.js
// exports.getAcademicGroups = async (req, res) => {
//     try {
//         const groups = await AcademicGroup.find()
//             .populate('faculty', 'fullName email') // Populate faculty details
//             .populate('classRepresentatives', 'fullName email')
//             .lean();

//         res.json({
//             success: true,
//             groups
//         });
//     } catch (error) {
//         console.error('Get groups error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error fetching groups'
//         });
//     }
// };

 

exports.getAcademicGroups = async (req, res) => {
    try {
        const userId = req.user._id; // Get current user's ID
 
        const groups = await AcademicGroup.find()
            .populate('faculty', 'fullName email')
            .populate('classRepresentatives', 'fullName email')
            .populate('students', 'fullName email')
            .lean();

        // Add isMember flag with safe checking
        const groupsWithMembership = groups.map(group => {
            const students = group.students || [];
            const isMember = students.some(student => 
                student && student._id && student._id.toString() === userId.toString()
            );

            return {
                ...group,
                isMember
            };
        });

        res.json({
            success: true,
            groups: groupsWithMembership
        });
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching groups'
        });
    }
};
 

// Get group details with access check
exports.getGroupDetails = async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const userId = req.user._id;
        
        const group = await AcademicGroup.findById(groupId);
        
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        // Check if user is a member
        const isMember = group.students.includes(userId) || 
                        group.classRepresentatives.includes(userId) ||
                        group.faculty.includes(userId);

        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this group'
            });
        }

        res.json({
            success: true,
            group: group
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching group details'
        });
    }
};

// Make announcement
exports.makeAnnouncement = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { title, content } = req.body;

        // Verify group and permissions
        const group = await AcademicGroup.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Academic group not found' });
        }

        const isFaculty = group.faculty.includes(req.user.userId);
        const isCR = group.classRepresentatives.includes(req.user.userId);

        if (!isFaculty && !isCR) {
            return res.status(403).json({ message: 'Not authorized to make announcements' });
        }

        const announcement = new AcademicResource({
            title,
            type: 'announcement',
            description: content,
            academicGroup: groupId,
            uploader: req.user.userId,
            isAnnouncement: true
        });

        await announcement.save();

        const populatedAnnouncement = await AcademicResource.findById(announcement._id)
            .populate('uploader', 'fullName email')
            .populate('academicGroup', 'batchYear department semester');

        res.status(201).json({
            message: 'Announcement created successfully',
            announcement: populatedAnnouncement
        });
    } catch (error) {
        console.error('Make announcement error:', error);
        res.status(500).json({ message: 'Error creating announcement' });
    }
};

// Upload resource
 
// academic.controller.js
exports.uploadResource = async (req, res) => {
    try {
        console.log('Starting upload process...');
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const { title, type, description, subject, academicGroupId } = req.body;

        const group = await AcademicGroup.findById(academicGroupId);
        if (!group) {
            return res.status(404).json({ message: 'Academic group not found' });
        }

        // Create resource document with file information matching your schema
        const resource = new AcademicResource({
            title,
            type,
            description,
            subject: JSON.parse(subject),
            academicGroup: academicGroupId,
            uploader: req.user._id,
            files: req.files.map(file => ({
                filename: file.filename,  // matches your schema
                originalName: file.originalname,  // matches your schema
                path: file.path.replace(/\\/g, '/').replace(/^public\//, ''),
  // convert Windows path to Unix style
                uploadedAt: new Date()  // matches your schema
            })),
            isAnnouncement: type === 'announcement',
            deadline: type === 'assignment' ? req.body.deadline : undefined
        });

        // Save the resource
        const savedResource = await resource.save();
        console.log('Saved resource:', savedResource);

        // Update the academic group
        await AcademicGroup.findByIdAndUpdate(
            academicGroupId,
            { $push: { resources: savedResource._id } }
        );

        res.status(201).json({
            message: 'Resource uploaded successfully',
            resource: savedResource
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            message: 'Error uploading resource',
            error: error.message
        });
    }
};
// Get group resources
exports.getGroupResources = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { type, subject } = req.query;

        // Build query
        const query = { academicGroup: groupId };
        if (type) query.type = type;
        if (subject) query['subject.code'] = subject;

        const resources = await AcademicResource.find(query)
            .sort({ createdAt: -1 })
            .populate('uploader', 'fullName email');

        res.json({
            success: true,
            count: resources.length,
            resources
        });
    } catch (error) {
        console.error('Get resources error:', error);
        res.status(500).json({ message: 'Error fetching resources' });
    }
};

// Get specific resource
exports.getResourceById = async (req, res) => {
    try {
        const { resourceId } = req.params;
        
        const resource = await AcademicResource.findById(resourceId)
            .populate('uploader', 'fullName email')
            .populate('academicGroup', 'batchYear department semester');

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        res.json({
            success: true,
            resource
        });
    } catch (error) {
        console.error('Get resource error:', error);
        res.status(500).json({ message: 'Error fetching resource' });
    }
};

// Delete resource
exports.deleteResource = async (req, res) => {
    try {
        const { resourceId } = req.params;
        
        const resource = await AcademicResource.findById(resourceId);
        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Check if user has permission to delete
        const group = await AcademicGroup.findById(resource.academicGroup);
        const isFaculty = group.faculty.includes(req.user.userId);
        const isUploader = resource.uploader.toString() === req.user.userId;

        if (!isFaculty && !isUploader) {
            return res.status(403).json({ message: 'Not authorized to delete this resource' });
        }

        await resource.remove();

        res.json({
            success: true,
            message: 'Resource deleted successfully'
        });
    } catch (error) {
        console.error('Delete resource error:', error);
        res.status(500).json({ message: 'Error deleting resource' });
    }
};

// Add CR to group
exports.addCR = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { crIds } = req.body;

        const group = await AcademicGroup.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Academic group not found' });
        }

        // Add new CRs
        group.classRepresentatives = [...new Set([...group.classRepresentatives, ...crIds])];
        await group.save();

        const updatedGroup = await AcademicGroup.findById(groupId)
            .populate('classRepresentatives', 'fullName email')
            .populate('faculty', 'fullName email');

        res.json({
            success: true,
            message: 'CR added successfully',
            group: updatedGroup
        });
    } catch (error) {
        console.error('Add CR error:', error);
        res.status(500).json({ message: 'Error adding CR' });
    }
};

// Add faculty to group
exports.addFaculty = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { facultyIds } = req.body;

        const group = await AcademicGroup.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Academic group not found' });
        }

        // Add new faculty
        group.faculty = [...new Set([...group.faculty, ...facultyIds])];
        await group.save();

        const updatedGroup = await AcademicGroup.findById(groupId)
            .populate('classRepresentatives', 'fullName email')
            .populate('faculty', 'fullName email');

        res.json({
            success: true,
            message: 'Faculty added successfully',
            group: updatedGroup
        });
    } catch (error) {
        console.error('Add faculty error:', error);
        res.status(500).json({ message: 'Error adding faculty' });
    }
};

 

// Add these new functions

// Get resources with advanced filtering and search
exports.getFilteredResources = async (req, res) => {
    try {
        const { 
            groupId,
            type,
            subject,
            search,
            sortBy,
            order = 'desc',
            page = 1,
            limit = 10
        } = req.query;

        // Build query
        const query = {};
        
        // Group filter
        if (groupId) {
            query.academicGroup = groupId;
        }

        // Type filter (notes, slides, assignment)
        if (type) {
            query.type = type;
        }

        // Subject filter
        if (subject) {
            query['subject.code'] = subject;
        }

        // Search in title and description
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Sorting options
        const sortOptions = {
            newest: { createdAt: -1 },
            oldest: { createdAt: 1 },
            title: { title: order === 'desc' ? -1 : 1 }
        };

        const resources = await AcademicResource.find(query)
            .sort(sortOptions[sortBy] || sortOptions.newest)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('uploader', 'fullName email')
            .populate('academicGroup', 'batchYear department semester');

        const total = await AcademicResource.countDocuments(query);

        res.json({
            success: true,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalResources: total,
            resources: resources.map(resource => ({
                id: resource._id,
                title: resource.title,
                type: resource.type,
                subject: resource.subject,
                description: resource.description,
                uploader: resource.uploader,
                uploadedAt: resource.createdAt,
                fileCount: resource.files.length
            }))
        });
    } catch (error) {
        console.error('Get filtered resources error:', error);
        res.status(500).json({ message: 'Error fetching resources' });
    }
};

// Get resource statistics
exports.getResourceStats = async (req, res) => {
    try {
        const { groupId } = req.params;

        // Get statistics by type
        const typeStats = await AcademicResource.aggregate([
            { 
                $match: { 
                    academicGroup: mongoose.Types.ObjectId(groupId) 
                } 
            },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    totalFiles: { $sum: { $size: '$files' } }
                }
            }
        ]);

        // Get statistics by subject
        const subjectStats = await AcademicResource.aggregate([
            { 
                $match: { 
                    academicGroup: mongoose.Types.ObjectId(groupId) 
                } 
            },
            {
                $group: {
                    _id: '$subject.code',
                    subjectName: { $first: '$subject.name' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get recent activity
        const recentActivity = await AcademicResource.find({ academicGroup: groupId })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('uploader', 'fullName');

        res.json({
            success: true,
            statistics: {
                byType: typeStats,
                bySubject: subjectStats,
                recentActivity: recentActivity.map(activity => ({
                    id: activity._id,
                    title: activity.title,
                    type: activity.type,
                    uploader: activity.uploader.fullName,
                    uploadedAt: activity.createdAt
                }))
            }
        });
    } catch (error) {
        console.error('Get resource stats error:', error);
        res.status(500).json({ message: 'Error fetching resource statistics' });
    }
};

// Get subject-wise resources
exports.getSubjectResources = async (req, res) => {
    try {
        const { groupId, subjectCode } = req.params;

        const resources = await AcademicResource.find({
            academicGroup: groupId,
            'subject.code': subjectCode
        })
        .sort({ type: 1, createdAt: -1 })
        .populate('uploader', 'fullName email');

        // Group resources by type
        const groupedResources = resources.reduce((acc, resource) => {
            if (!acc[resource.type]) {
                acc[resource.type] = [];
            }
            acc[resource.type].push({
                id: resource._id,
                title: resource.title,
                description: resource.description,
                uploader: resource.uploader,
                uploadedAt: resource.createdAt,
                fileCount: resource.files.length
            });
            return acc;
        }, {});

        res.json({
            success: true,
            subject: resources[0]?.subject,
            resourcesByType: groupedResources
        });
    } catch (error) {
        console.error('Get subject resources error:', error);
        res.status(500).json({ message: 'Error fetching subject resources' });
    }
};

// backend/controllers/academic.controller.js

exports.addStudents = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { students } = req.body; // Expect an array of student emails

        // Find the group
        const group = await AcademicGroup.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        // Check if the requester is admin or faculty
        const isFaculty = group.faculty.includes(req.user._id);
        const isClassRep = group.classRepresentatives.includes(req.user._id);
        
        if (!isFaculty && !isClassRep && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to add students'
            });
        }

        // Find users by email
        const userEmails = Array.isArray(students) ? students : [students];
        const users = await User.find({ email: { $in: userEmails } });

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No valid student emails found'
            });
        }

        // Get user IDs and filter out already existing students
        const newStudentIds = users.map(user => user._id)
            .filter(id => !group.students.includes(id));

        if (newStudentIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'All students are already in the group'
            });
        }

        // Add new students to the group
        group.students.push(...newStudentIds);
        await group.save();

        res.json({
            success: true,
            message: `Successfully added ${newStudentIds.length} students to the group`,
            addedStudents: users.filter(user => newStudentIds.includes(user._id))
        });

    } catch (error) {
        console.error('Add students error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding students to group'
        });
    }
};


