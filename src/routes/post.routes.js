const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const postController = require('../controllers/post.controller');

// Create post with media
router.post('/', 
    auth, 
    upload.array('media', 5), // Allow up to 5 files
    postController.createPost
);
// Create post with single image
 
router.get('/channel/:channelId', auth, postController.getChannelPosts);


// Add download route
router.get('/:postId/download/:fileId', auth, postController.downloadFile);

// Get all posts
router.get('/', auth, postController.getPosts);

// Get a single post
router.get('/:id', auth, postController.getPost);

// Update a post
router.put('/:id', auth, postController.updatePost);

// Delete a post
router.delete('/:id', auth, postController.deletePost);

// Like/Unlike a post
router.post('/:id/like', auth, postController.likePost);

// Add a comment to a post
router.post('/:id/comment', auth, postController.addComment);

// Make sure these routes come BEFORE the /:id route
router.get('/search/posts', auth, postController.searchPosts);
router.get('/user/posts', auth, postController.getUserPosts);
router.get('/trending/posts', auth, postController.getTrendingPosts);

module.exports = router;