const LostFound = require('../models/lostFound.model');
const { findPotentialMatches } = require('../utils/itemMatcher');
// Create lost/found item
// src/controllers/lostFound.controller.js
// src/controllers/lostFound.controller.js
exports.createItem = async (req, res) => {
    try {
        console.log('Received body:', req.body);
        console.log('Received files:', req.files);

        // Parse contactInfo if it's a string
        let contactInfo = req.body.contactInfo;
        if (typeof contactInfo === 'string') {
            try {
                contactInfo = JSON.parse(contactInfo);
            } catch (e) {
                console.error('Error parsing contactInfo:', e);
            }
        }

        // Process image paths
        let imagePaths = [];
        if (req.files && req.files.length > 0) {
            imagePaths = req.files.map(file => {
                // Convert Windows path separators to forward slashes
                return file.path.replace('public', '').replace(/\\/g, '/');
            });
        }

        // Create item data
        const itemData = {
            title: req.body.title,
            description: req.body.description,
            type: req.body.type.trim(),
            category: req.body.category,
            location: req.body.location,
            date: req.body.date,
            contactInfo: contactInfo,
            images: imagePaths,
            reporter: req.user._id
        };

        console.log('Processed item data:', itemData);

        // Create new item
        const newItem = new LostFound(itemData);
        await newItem.save();

        res.status(201).json({
            success: true,
            message: 'Item created successfully',
            item: newItem
        });

    } catch (error) {
        console.warn('Create lost/found item error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create item',
            error: error.message
        });
    }
};
// Get all items
exports.getItems = async (req, res) => {
    try {
        const { type, category, status, page = 1, limit = 10 } = req.query;

        const query = {};
        if (type) query.type = type;
        if (category) query.category = category;
        if (status) query.status = status;

        const items = await LostFound.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('reporter', 'fullName profilePicture')
            .populate('claims.user', 'fullName profilePicture');

        const total = await LostFound.countDocuments(query);

        res.json({
            items,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total
        });
    } catch (error) {
        console.error('Get items error:', error);
        res.status(500).json({ message: 'Error fetching items' });
    }
};

// Get single item
exports.getItem = async (req, res) => {
    try {
        const item = await LostFound.findById(req.params.id)
            .populate('reporter', 'fullName profilePicture')
            .populate('claims.user', 'fullName profilePicture');

        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        res.json(item);
    } catch (error) {
        console.error('Get item error:', error);
        res.status(500).json({ message: 'Error fetching item' });
    }
};

 

// Update status
// Update status
exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const itemId = req.params.id;

        const item = await LostFound.findById(itemId);

        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        // Check if user is the reporter
        if (item.reporter.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Update item status
        item.status = status;
        await item.save();

        const updatedItem = await LostFound.findById(itemId)
            .populate('reporter', 'fullName profilePicture')
            .populate('claims.user', 'fullName profilePicture');

        res.json({
            message: 'Status updated successfully',
            item: updatedItem
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ message: 'Error updating status' });
    }
};

// Add a new endpoint to view claims

// Get all claims for an item
exports.getItemClaims = async (req, res) => {
    try {
        const { id: itemId } = req.params;

        const item = await LostFound.findById(itemId)
            .populate('claims.user', 'fullName profilePicture')
            .populate('reporter', 'fullName profilePicture');

        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        res.json({
            itemId: item._id,
            itemTitle: item.title,
            reporter: item.reporter,
            totalClaims: item.claims.length,
            claims: item.claims.map(claim => ({
                id: claim._id,
                user: claim.user,
                message: claim.message,
                proofImage: claim.proofImage,
                status: claim.status,
                createdAt: claim.createdAt
            }))
        });

    } catch (error) {
        console.error('Get claims error:', error);
        res.status(500).json({ message: 'Error fetching claims' });
    }
};

// Submit a claim
// src/controllers/lostFound.controller.js

exports.submitClaim = async (req, res) => {
    try {
        console.log('Submitting claim:', {
            itemId: req.params.id,
            message: req.body.message,
            file: req.file
        });

        const { id } = req.params;
        const userId = req.user._id;

        // Validate message
        if (!req.body.message) {
            return res.status(400).json({
                success: false,
                message: 'Claim description is required'
            });
        }

        // Find the item
        const item = await LostFound.findById(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        // Create new claim
        const newClaim = {
            user: userId,
            message: req.body.message,
            status: 'pending',
            createdAt: new Date()
        };

        // Add proof image if provided
        if (req.file) {
            // Format the path to match your storage structure
            newClaim.proofImage = `/uploads/lostfound/${req.file.filename}`;
        }

        // Add claim to item's claims array
        item.claims.push(newClaim);

        // Save the updated item
        await item.save();

        // Populate user details for the new claim
        await item.populate('claims.user', 'fullName profilePicture');

        // Get the newly added claim
        const addedClaim = item.claims[item.claims.length - 1];

        res.status(201).json({
            success: true,
            message: 'Claim submitted successfully',
            claim: {
                id: addedClaim._id,
                user: {
                    _id: addedClaim.user._id,
                    fullName: addedClaim.user.fullName,
                    profilePicture: addedClaim.user.profilePicture
                },
                message: addedClaim.message,
                proofImage: addedClaim.proofImage,
                status: addedClaim.status,
                createdAt: addedClaim.createdAt
            }
        });

    } catch (error) {
        console.error('Submit claim error:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting claim'
        });
    }
};


exports.findRelatedItems = async (req, res) => {
    try {
        const { itemId } = req.params;
        
        // Get the target item
        const targetItem = await LostFound.findById(itemId);
        if (!targetItem) {
            return res.status(404).json({ message: 'Item not found' });
        }

        // Get potential matching items (opposite type)
        const oppositeType = targetItem.type === 'lost' ? 'found' : 'lost';
        const itemPool = await LostFound.find({ 
            type: oppositeType,
            status: 'open',
            createdAt: {
                $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
        });

        // Find matches
        const matches = findPotentialMatches(targetItem, itemPool);

        res.json({
            success: true,
            targetItem: {
                id: targetItem._id,
                type: targetItem.type,
                category: targetItem.category,
                description: targetItem.description
            },
            matches: matches.map(match => ({
                id: match.item._id,
                type: match.item.type,
                category: match.item.category,
                description: match.item.description,
                location: match.item.location,
                date: match.item.date,
                matchScore: match.score,
                matchDetails: match.matchDetails
            }))
        });

    } catch (error) {
        console.error('Find related items error:', error);
        res.status(500).json({ message: 'Error finding related items' });
    }
};

// In controllers/lostFound.controller.js

// Middleware to check if user is admin or item creator
exports.checkItemOwnership = async (req, res, next) => {
    try {
        const item = await LostFound.findById(req.params.id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        // Check if user is admin or creator
        const isAdmin = req.user.role === 'admin';
        const isCreator = item.reporter.toString() === req.user._id.toString();

        if (!isAdmin && !isCreator) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this item\'s status'
            });
        }

        // Attach item to request for use in next middleware
        req.item = item;
        next();
    } catch (error) {
        console.error('Authorization check error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking authorization'
        });
    }
};

// Controller to update item status
exports.updateItemStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user._id;

        console.log('Update status request:', {
            itemId: id,
            newStatus: status,
            userId: userId
        });

        // Validate status first
        const validStatuses = ['open', 'claimed', 'resolved', 'closed'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        // Find and update the item
        const item = await LostFound.findById(id);
        
        // Check if item exists
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        // Check authorization
        const isCreator = item.reporter.toString() === userId.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isCreator && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this item\'s status'
            });
        }

        // Update the status
        item.status = status;
        const updatedItem = await item.save();

        // Send response
        res.json({
            success: true,
            message: 'Status updated successfully',
            item: {
                _id: updatedItem._id,
                title: updatedItem.title,
                status: updatedItem.status,
                updatedAt: updatedItem.updatedAt
            }
        });

    } catch (error) {
        console.error('Status update error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating status'
        });
    }
};

exports.updateClaimStatus = async (req, res) => {
    try {
        const { itemId, claimId } = req.params;
        const { status } = req.body;
        const userId = req.user._id;

        // Validate status
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be either "approved" or "rejected"'
            });
        }

        // Find the item
        const item = await LostFound.findById(itemId);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        // Check authorization (only item reporter or admin can update claim status)
        const isReporter = item.reporter.toString() === userId.toString();
        const isAdmin = req.user.role === 'admin';
        if (!isReporter && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update claim status'
            });
        }

        // Find the specific claim
        const claim = item.claims.id(claimId);
        if (!claim) {
            return res.status(404).json({
                success: false,
                message: 'Claim not found'
            });
        }

        // Update claim status
        claim.status = status;

        // If claim is approved
        if (status === 'approved') {
            // Update item status to resolved
            item.status = 'resolved';
            
            // Reject all other pending claims
            item.claims.forEach(otherClaim => {
                if (otherClaim._id.toString() !== claimId) {
                    otherClaim.status = 'rejected';
                }
            });
        }

        // Save the updated item
        await item.save();

        res.json({
            success: true,
            message: `Claim ${status} successfully`,
            item: {
                _id: item._id,
                status: item.status,
                claims: item.claims.map(c => ({
                    _id: c._id,
                    status: c.status,
                    message: c.message,
                    createdAt: c.createdAt
                }))
            }
        });

    } catch (error) {
        console.error('Update claim status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating claim status'
        });
    }
};

exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Find the item
        const item = await LostFound.findById(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        // Check if user is authorized to delete (creator or admin)
        const isCreator = item.reporter.toString() === userId.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isCreator && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this item'
            });
        }

        // Delete the item
        await LostFound.findByIdAndDelete(id);

        // Delete associated images if any
        if (item.images && item.images.length > 0) {
            // Add your image deletion logic here if needed
        }

        res.json({
            success: true,
            message: 'Item deleted successfully'
        });

    } catch (error) {
        console.error('Delete item error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting item'
        });
    }
};