// middleware/chatValidation.middleware.js
const chatValidation = {
    validateMessage: (req, res, next) => {
        const { content } = req.body;
        
        if (!content && !req.file) {
            return res.status(400).json({
                success: false,
                message: 'Message content or file is required'
            });
        }

        if (content && content.length > 2000) {
            return res.status(400).json({
                success: false,
                message: 'Message content too long (max 2000 characters)'
            });
        }

        next();
    },

    validateChannelAccess: async (req, res, next) => {
        try {
            const channelId = req.params.channelId;
            const userId = req.user._id;

            const channel = await Channel.findById(channelId);
            
            if (!channel) {
                return res.status(404).json({
                    success: false,
                    message: 'Channel not found'
                });
            }

            const isMember = channel.members.some(
                member => member.user.toString() === userId.toString()
            );

            if (!isMember) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: Not a channel member'
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    }
};

module.exports = chatValidation;