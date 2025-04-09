const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const upload = require('../middleware/lostFoundUpload.middleware');
const lostFoundController = require('../controllers/lostFound.controller');

// Create item
router.post('/', 
    auth, 
    upload.array('images', 5),
    lostFoundController.createItem
);

// Get all items
router.get('/', auth, lostFoundController.getItems);

// Get single item
router.get('/:id', auth, lostFoundController.getItem);

// Get all claims for an item
router.get('/:id/claims', auth, lostFoundController.getItemClaims);

// Submit a claim
router.post('/:id/claim',
    auth,
    upload.single('proofImage'),
    lostFoundController.submitClaim
);

// Update claim status
router.put('/:id/claim/:claimId',
    auth,
    lostFoundController.updateClaimStatus
);

//related itemss
router.get('/:itemId/related', auth, lostFoundController.findRelatedItems);

// In routes/lostFound.routes.js

// Add this route to your existing routes
router.patch('/:id/status', auth, lostFoundController.updateItemStatus);

// Add this route with your existing routes
router.patch('/:itemId/claims/:claimId/status',
    auth,
    lostFoundController.updateClaimStatus
);

router.delete('/:id', auth, lostFoundController.deleteItem);

module.exports = router;