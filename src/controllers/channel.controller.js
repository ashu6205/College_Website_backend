const Channel = require('../models/channel.model');
const User = require('../models/user.model');

// Create a new channel
exports.createChannel = async (req, res) => {
    try {
        const { name, description, type = 'general' } = req.body;
        const creator = req.user._id; // Authenticated user

        // Create channel with creator as an admin
        const channel = await Channel.create({
            name,
            description,
            type,
            creator,
            members: [{ user: creator, role: 'admin' }] // Ensure creator is added
        });

        // Populate creator and members
        const populatedChannel = await Channel.findById(channel._id)
            .populate('creator', 'fullName email')
            .populate('members.user', 'fullName email');

        res.status(201).json({
            success: true,
            data: populatedChannel
        });
    } catch (error) {
        console.error('Error creating channel:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating channel',
            error: error.message
        });
    }
};
 
exports.deleteChannel = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the channel
        const channel = await Channel.findById(id);
        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        // Ensure only the admin can delete the channel
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can delete channels' });
        }

        // Delete the channel
        await Channel.findByIdAndDelete(id);
        res.json({ message: 'Channel deleted successfully' });
    } catch (error) {
        console.error('Error deleting channel:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all channels
exports.getChannels = async (req, res) => {
    try {
        const channels = await Channel.find({ isPrivate: false })
            .populate('creator', 'fullName profilePicture')
            .populate('members.user', 'fullName profilePicture');

        res.json(channels);
    } catch (error) {
        console.error('Get channels error:', error);
        res.status(500).json({ message: 'Error fetching channels' });
    }
};

// Get single channel
exports.getChannel = async (req, res) => {
    try {
        const channel = await Channel.findById(req.params.id)
            .populate('creator', 'fullName profilePicture')
            .populate('members.user', 'fullName profilePicture')
            .populate('pinnedPosts');

        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        res.json(channel);
    } catch (error) {
        console.error('Get channel error:', error);
        res.status(500).json({ message: 'Error fetching channel' });
    }
};

// Join channel
exports.joinChannel = async (req, res) => {
    try {
        const channel = await Channel.findById(req.params.id);

        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        if (channel.isPrivate) {
            return res.status(403).json({ message: 'This is a private channel' });
        }

        // Check if user is already a member
        const isMember = channel.members.some(member => 
            member.user.toString() === req.user.userId
        );

        if (isMember) {
            return res.status(400).json({ message: 'Already a member' });
        }

        channel.members.push({
            user: req.user.userId,
            role: 'member'
        });

        await channel.save();

        const updatedChannel = await Channel.findById(channel._id)
            .populate('creator', 'fullName profilePicture')
            .populate('members.user', 'fullName profilePicture');

        res.json(updatedChannel);
    } catch (error) {
        console.error('Join channel error:', error);
        res.status(500).json({ message: 'Error joining channel' });
    }
};

// Leave channel
exports.leaveChannel = async (req, res) => {
    try {
        const channel = await Channel.findById(req.params.id);

        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        console.log("User trying to leave:", req.user.userId);
        console.log("Current members before filtering:", channel.members);

        // Remove null values from the members array
        channel.members = channel.members.filter(member => member && member.user);

        console.log("Filtered members:", channel.members);

        // Check if user is the creator
        if (channel.creator.toString() === req.user.userId) {
            return res.status(400).json({ message: 'Channel creator cannot leave' });
        }

        // Remove user from members list
        channel.members = channel.members.filter(
            member => member.user.toString() !== req.user.userId
        );

        await channel.save();

        res.json({ message: 'Successfully left the channel' });
    } catch (error) {
        console.error('Leave channel error:', error);
        res.status(500).json({ message: 'Error leaving channel' });
    }
};



exports.updateChannel = async (req, res) => {
    try {
        const { name, description, rules, settings } = req.body;
        const channel = await Channel.findById(req.params.id);

        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        // Check if user is admin
        const member = channel.members.find(m => 
            m.user.toString() === req.user.userId && 
            (m.role === 'admin' || m.role === 'moderator')
        );

        if (!member) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        channel.name = name || channel.name;
        channel.description = description || channel.description;
        channel.rules = rules || channel.rules;
        channel.settings = { ...channel.settings, ...settings };

        await channel.save();
        res.json(channel);
    } catch (error) {
        console.error('Update channel error:', error);
        res.status(500).json({ message: 'Error updating channel' });
    }
};

// Manage member roles
exports.updateMemberRole = async (req, res) => {
    try {
        const { userId, role } = req.body;
        const channel = await Channel.findById(req.params.id);

        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        // Check if user is admin
        const isAdmin = channel.members.some(m => 
            m.user.toString() === req.user.userId && 
            m.role === 'admin'
        );

        if (!isAdmin) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const memberIndex = channel.members.findIndex(m => 
            m.user.toString() === userId
        );

        if (memberIndex === -1) {
            return res.status(404).json({ message: 'Member not found' });
        }

        channel.members[memberIndex].role = role;
        await channel.save();

        res.json(channel);
    } catch (error) {
        console.error('Update member role error:', error);
        res.status(500).json({ message: 'Error updating member role' });
    }
};

// Pin/Unpin post
exports.togglePinPost = async (req, res) => {
    try {
        const { postId } = req.body;
        const channel = await Channel.findById(req.params.id);

        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        // Check if user is moderator or admin
        const hasPermission = channel.members.some(m => 
            m.user.toString() === req.user.userId && 
            (m.role === 'admin' || m.role === 'moderator')
        );

        if (!hasPermission) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const isPinned = channel.pinnedPosts.includes(postId);
        if (isPinned) {
            channel.pinnedPosts = channel.pinnedPosts.filter(p => p.toString() !== postId);
        } else {
            channel.pinnedPosts.push(postId);
        }

        await channel.save();
        res.json(channel);
    } catch (error) {
        console.error('Toggle pin post error:', error);
        res.status(500).json({ message: 'Error updating pinned posts' });
    }
};

// Remove member
exports.removeMember = async (req, res) => {
    try {
        const { userId } = req.body;
        const channel = await Channel.findById(req.params.id);

        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        // Check if user has permission
        const hasPermission = channel.members.some(m => 
            m.user.toString() === req.user.userId && 
            (m.role === 'admin' || m.role === 'moderator')
        );

        if (!hasPermission) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Cannot remove admin
        const targetMember = channel.members.find(m => m.user.toString() === userId);
        if (targetMember && targetMember.role === 'admin') {
            return res.status(403).json({ message: 'Cannot remove admin' });
        }

        channel.members = channel.members.filter(m => m.user.toString() !== userId);
        await channel.save();

        res.json({ message: 'Member removed successfully' });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ message: 'Error removing member' });
    }
};