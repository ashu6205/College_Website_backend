const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:"http://localhost:5000/api/auth/google/callback", // Ensure this matches your Google console settings
    passReqToCallback: true // Allows passing request object if needed
}, async (request, accessToken, refreshToken, profile, done) => {
    try {
        console.log("Google Profile:", profile); // Log the entire profile for debugging
        const { id, displayName, emails } = profile;
        const email = emails[0].value;

        let user = await User.findOne({ email });

        if (!user) {
            user = new User({
                googleId: id,
                fullName: displayName,
                email,
                
                department: 'N/A', 
                batch: 'N/A'
            });

            await user.save();
        }

        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

// Serialize & Deserialize User (if using sessions)
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
