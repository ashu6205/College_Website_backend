// // src/middleware/auth.middleware.js
// const jwt = require('jsonwebtoken');
// const User = require('../models/user.model');

// const auth = async (req, res, next) => {
//     try {
//         const token = req.header('Authorization').replace('Bearer ', '');
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         const user = await User.findOne({ _id: decoded.userId });

//         if (!user) {
//             throw new Error();
//         }

//         req.token = token;
//         req.user = user;
//         next();
//     } catch (error) {
//         res.status(401).json({ message: 'Please authenticate.' });
//     }
// };

// module.exports = auth;


const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.token = token;
        req.user = { ...user.toObject(), userId: user._id.toString() };  // Ensure `userId` is accessible

         

        next();
    } catch (error) {
        console.error("Authentication Error:", error);
        res.status(401).json({ message: 'Please authenticate.' });
    }
};

module.exports = auth;
