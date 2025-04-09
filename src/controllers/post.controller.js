const Post = require('../models/post.model');
const User = require('../models/user.model');
const path = require('path');
const Channel = require('../models/channel.model');

// Add this function at the top of the file
const handleMediaUpload = async (files) => {
    if (!files) return [];
    
    return files.map(file => ({
        url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        type: file.mimetype.startsWith('image/') ? 'image' : 'video'
    }));
};

// Create a new post
exports.createPost = async (req, res) => {
    try {
        const { content, isAnonymous, tags, visibility, channelId } = req.body;

        // Handle files
        const mediaFiles = req.files ? req.files.map(file => {
            let fileType = 'documents';
            if (file.mimetype.startsWith('image/')) {
                fileType = 'image';
            } else if (file.mimetype.startsWith('video/')) {
                fileType = 'video';
            }

            return {
                filename: file.filename,
                originalName: file.originalname,
                path: `/uploads/${fileType}s/${file.filename}`,
                fileType: fileType,
                mimeType: file.mimetype
            };
        }) : [];

        // Handle tags
        let parsedTags = [];
        if (tags) {
            try {
                parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
            } catch (e) {
                parsedTags = [tags];
            }
        }

        const postData = {
            author: req.user._id,
            content,
            media: mediaFiles,
            isAnonymous: isAnonymous === 'true',
            tags: parsedTags,
            visibility: visibility || 'public'
        };

        if (channelId) {
            const channel = await Channel.findById(channelId);
            if (!channel) {
                return res.status(404).json({ message: 'Channel not found' });
            }

            const isMember = channel.members.some(m => 
                m.user.toString() === req.user.userId
            );

            if (!isMember) {
                return res.status(403).json({ message: 'Not a channel member' });
            }

            postData.channel = channelId;
            postData.visibility = 'channel';
        }

        const post = new Post(postData);
        await post.save();

        const populatedPost = await Post.findById(post._id)
            .populate('author', 'fullName profilePicture')
            .populate('channel', 'name');

        res.status(201).json(populatedPost);
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ 
            message: 'Error creating post', 
            error: error.message 
        });
    }
};

// Add download route
exports.downloadFile = async (req, res) => {
    try {
        const { postId, fileId } = req.params;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const file = post.media.id(fileId);
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Remove the leading slash from the path
        const filePath = path.join(__dirname, '../../public', file.path);

        res.download(filePath, file.originalName);
    } catch (error) {
        console.error('Download file error:', error);
        res.status(500).json({ message: 'Error downloading file' });
    }
};


// Get all posts
exports.getPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const posts = await Post.find({ visibility: 'public' })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('author', 'fullName profilePicture')
            .populate('comments.user', 'fullName profilePicture');

        const total = await Post.countDocuments({ visibility: 'public' });

        res.json({
            posts,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalPosts: total
        });
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ message: 'Error fetching posts' });
    }
};

// Get a single post
exports.getPost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'fullName profilePicture')
            .populate('comments.user', 'fullName profilePicture');

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        res.json(post);
    } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({ message: 'Error fetching post' });
    }
};

// Update a post
exports.updatePost = async (req, res) => {
    try {
        const { content, tags } = req.body;
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        if (post.author.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        post.content = content || post.content;
        post.tags = tags || post.tags;

        await post.save();
        res.json(post);
    } catch (error) {
        console.error('Update post error:', error);
        res.status(500).json({ message: 'Error updating post' });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Convert both IDs to strings for comparison
        const postAuthorId = post.author.toString();
        const currentUserId = req.user._id.toString();

        console.log("Post Author ID:", postAuthorId);
        console.log("Current User ID:", currentUserId);

        if (postAuthorId !== currentUserId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Delete associated media files
        if (post.media && post.media.length > 0) {
            const fs = require('fs').promises;
            await Promise.all(post.media.map(async (file) => {
                try {
                    await fs.unlink(path.join('public', file.path));
                } catch (err) {
                    console.error('Error deleting file:', err);
                }
            }));
        }

        await post.remove();
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ message: 'Error deleting post' });
    }
};

// Like/Unlike a post
exports.likePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const likeIndex = post.likes.indexOf(req.user.userId);

        if (likeIndex === -1) {
            post.likes.push(req.user.userId);
        } else {
            post.likes.splice(likeIndex, 1);
        }

        await post.save();
        res.json(post);
    } catch (error) {
        console.error('Like post error:', error);
        res.status(500).json({ message: 'Error updating post likes' });
    }
};

// Add a comment
exports.addComment = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const newComment = {
            user: req.user.userId,
            content: req.body.content
        };

        post.comments.push(newComment);
        await post.save();

        const updatedPost = await Post.findById(req.params.id)
            .populate('author', 'fullName profilePicture')
            .populate('comments.user', 'fullName profilePicture');

        res.json(updatedPost);
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ message: 'Error adding comment' });
    }
};

// Search posts
exports.searchPosts = async (req, res) => {
    try {
        const { query, tags } = req.query;
        const searchQuery = {};

        if (query) {
            searchQuery.content = { $regex: query, $options: 'i' };
        }

        if (tags) {
            searchQuery.tags = { $in: tags.split(',') };
        }

        const posts = await Post.find(searchQuery)
            .populate('author', 'fullName profilePicture')
            .populate('comments.user', 'fullName profilePicture')
            .sort({ createdAt: -1 });

        res.json(posts);
    } catch (error) {
        console.error('Search posts error:', error);
        res.status(500).json({ message: 'Error searching posts' });
    }
};

// Get trending posts
exports.getTrendingPosts = async (req, res) => {
    try {
        const posts = await Post.aggregate([
            {
                $addFields: {
                    score: {
                        $add: [
                            { $size: "$likes" },
                            { $multiply: [{ $size: "$comments" }, 2] }
                        ]
                    }
                }
            },
            { $sort: { score: -1 } },
            { $limit: 10 }
        ]);

        await Post.populate(posts, [
            { path: 'author', select: 'fullName profilePicture' },
            { path: 'comments.user', select: 'fullName profilePicture' }
        ]);

        res.json(posts);
    } catch (error) {
        console.error('Get trending posts error:', error);
        res.status(500).json({ message: 'Error fetching trending posts' });
    }
};

exports.getUserPosts = async (req, res) => {
    try {
        const userId = req.params.userId || req.user.userId;
        
        const posts = await Post.find({ 
            author: userId,
            $or: [
                { visibility: 'public' },
                { author: req.user.userId }
            ]
        })
        .populate('author', 'fullName profilePicture')
        .populate('comments.user', 'fullName profilePicture')
        .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: posts.length,
            posts: posts
        });
    } catch (error) {
        console.error('Get user posts error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching user posts',
            error: error.message 
        });
    }
};

exports.getChannelPosts = async (req, res) => {
    try {
        const { channelId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Verify channel membership
        const channel = await Channel.findById(channelId);
        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        const isMember = channel.members.some(m => 
            m.user.toString() === req.user.userId
        );

        if (!isMember) {
            return res.status(403).json({ message: 'Not a channel member' });
        }

        // Get posts with pagination
        const posts = await Post.find({ channel: channelId })
            .sort({ isPinned: -1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('author', 'fullName profilePicture')
            .populate('comments.user', 'fullName profilePicture');

        const total = await Post.countDocuments({ channel: channelId });

        res.json({
            posts,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalPosts: total
        });
    } catch (error) {
        console.error('Get channel posts error:', error);
        res.status(500).json({ message: 'Error fetching channel posts' });
    }
};