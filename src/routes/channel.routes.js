const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const channelController = require('../controllers/channel.controller');



// Create new channel
router.post('/', auth, channelController.createChannel);
// Delete channel
router.delete('/:id', auth, channelController.deleteChannel);

// Get all channels
router.get('/', auth, channelController.getChannels);

// Get single channel
router.get('/:id', auth, channelController.getChannel);

// Join channel
router.post('/:id/join', auth, channelController.joinChannel);

// Leave channel
router.post('/:id/leave', auth, channelController.leaveChannel);


router.put('/:id', auth, channelController.updateChannel);
router.post('/:id/members/role', auth, channelController.updateMemberRole);
router.post('/:id/posts/pin', auth, channelController.togglePinPost);
router.delete('/:id/members', auth, channelController.removeMember);

module.exports = router;