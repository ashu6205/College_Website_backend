// controllers/chat.controller.js
const Message = require('../models/message.model');
const { getFileUrl } = require('../middleware/upload.middleware');
const { upload } = require('../middleware/chatUpload.middleware');
// Send text message
exports.sendMessage = async (req, res) => {
    try {
        const { channelId } = req.params;
        const { content } = req.body;
        const sender = req.user._id;

        console.log("jdh",sender);

        const message = await Message.create({
            channelId,
            sender,
            content,
            messageType: 'text'
        });

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'username avatar');

        // Emit socket event
        if (req.app.get('io')) {
            req.app.get('io').to(`channel_${channelId}`)
                .emit('new_message', populatedMessage);
        }

        res.status(201).json(populatedMessage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};





// Send file/image message
// exports.sendFileMessage = async (req, res) => {
//     try {
//         const { channelId } = req.params;
//         const file = req.file;
//         const sender = req.user._id;

//         if (!file) {
//             return res.status(400).json({ error: 'No file provided' });
//         }

//         const fileUrl = getFileUrl(file);

//         const message = await Message.create({
//             channelId,
//             sender,
//             content: file.originalname,
//             messageType: file.mimetype.startsWith('image/') ? 'image' : 'file',
//             attachments: [{
//                 fileUrl,
//                 fileName: file.originalname,
//                 fileType: file.mimetype,
//                 fileSize: file.size
//             }]
//         });

//         const populatedMessage = await Message.findById(message._id)
//             .populate('sender', 'username avatar');


//         // Add base URL to file URLs in response
//         if (populatedMessage.attachments && populatedMessage.attachments.length > 0) {
//             const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
//             populatedMessage.attachments = populatedMessage.attachments.map(attachment => ({
//                 ...attachment.toObject(),
//                 fileUrl: `${baseUrl}${attachment.fileUrl}`
//             }));
//         }

//         // Emit socket event
//         if (req.app.get('io')) {
//             req.app.get('io').to(`channel_${channelId}`)
//                 .emit('new_message', populatedMessage);
//         }

//         res.status(201).json(populatedMessage);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };

exports.sendFileMessage = async (req, res) => {
    try {
        const { channelId } = req.params;
        const file = req.file;
        const sender = req.user._id;

        if (!file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        // Construct proper file URL
        const fileUrl = `/uploads/chat/images/${file.filename}`;

        const message = await Message.create({
            channelId,
            sender,
            content: file.originalname,
            messageType: file.mimetype.startsWith('image/') ? 'image' : 'file',
            attachments: [{
                fileUrl,
                fileName: file.originalname,
                fileType: file.mimetype,
                fileSize: file.size
            }]
        });

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'username avatar');

        // Add base URL to response
        if (populatedMessage.attachments && populatedMessage.attachments.length > 0) {
            const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
            populatedMessage.attachments = populatedMessage.attachments.map(attachment => ({
                ...attachment.toObject(),
                fileUrl: `${baseUrl}${attachment.fileUrl}`
            }));
        }

        if (req.app.get('io')) {
            req.app.get('io').to(`channel_${channelId}`)
                .emit('new_message', populatedMessage);
        }

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error('Error sending file message:', error);
        res.status(500).json({ error: error.message });
    }
};
// Get messages with pagination
// exports.getMessages = async (req, res) => {
//     try {
//         const { channelId } = req.params;
//         const { page = 1, limit = 50 } = req.query;

//         const messages = await Message.find({ 
//             channelId,
//             isDeleted: false 
//         })
//             .populate('sender', 'username avatar')
//             .sort({ createdAt: -1 })
//             .skip((page - 1) * limit)
//             .limit(parseInt(limit))
//             .lean();

//         // Get total count for pagination
//         const total = await Message.countDocuments({
//             channelId,
//             isDeleted: false
//         });

//         res.json({
//             messages,
//             pagination: {
//                 total,
//                 page: parseInt(page),
//                 pages: Math.ceil(total / limit)
//             }
//         });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };

exports.getMessages = async (req, res) => {
    try {
        const { channelId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const [messages, total] = await Promise.all([
            Message.find({ channelId, isDeleted: false })
            .populate('sender', 'fullName profilePicture')
            // Populating sender details
                .sort({ createdAt: 1 }) // Oldest messages first
                .skip(skip)
                .limit(limit)
                .lean(),

            Message.countDocuments({ channelId, isDeleted: false }) // Getting total count
        ]);

        res.json({
            messages,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Server error' });
    }
};




// Delete message (soft delete)
exports.deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findOne({
            _id: messageId,
            sender: userId,
            isDeleted: false
        });

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        message.isDeleted = true;
        await message.save();

        // Emit socket event
        if (req.app.get('io')) {
            req.app.get('io').to(`channel_${message.channelId}`)
                .emit('message_deleted', messageId);
        }

        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Edit message
exports.editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user._id;

        const message = await Message.findOne({
            _id: messageId,
            sender: userId,
            isDeleted: false,
            messageType: 'text' // Only text messages can be edited
        });

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        message.content = content;
        message.isEdited = true;
        await message.save();

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'username avatar');

        // Emit socket event
        if (req.app.get('io')) {
            req.app.get('io').to(`channel_${message.channelId}`)
                .emit('message_edited', populatedMessage);
        }

        res.json(populatedMessage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
    try {
        const { channelId } = req.params;
        const userId = req.user._id;

        await Message.updateMany(
            {
                channelId,
                'readBy.userId': { $ne: userId }
            },
            {
                $addToSet: {
                    readBy: {
                        userId,
                        readAt: new Date()
                    }
                }
            }
        );

        res.json({ message: 'Messages marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get unread messages count
exports.getUnreadCount = async (req, res) => {
    try {
        const { channelId } = req.params;
        const userId = req.user._id;

        const count = await Message.countDocuments({
            channelId,
            isDeleted: false,
            'readBy.userId': { $ne: userId }
        });

        res.json({ unreadCount: count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Search messages
exports.searchMessages = async (req, res) => {
    try {
        const { channelId } = req.params;
        const { query } = req.query;

        const messages = await Message.find({
            channelId,
            isDeleted: false,
            content: { $regex: query, $options: 'i' }
        })
            .sort({ createdAt: -1 })
            .populate('sender', 'username avatar')
            .lean();

        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};