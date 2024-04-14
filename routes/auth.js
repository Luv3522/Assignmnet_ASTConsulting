const passport = require('passport');
const dotenv = require('dotenv');
const User = require('../models/users');
const { application } = require('express');
const express = require ('express');

dotenv.config();
// const app = express();
// app.use(passport.initialize());

GOOGLE_CLIENT_ID = '272722868548-6bpcb5fjiv30unsra9d9ic5l357c1886.apps.googleusercontent.com';
GOOGLE_CLIENT_SECRET = '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';
//app.use(passport.initialize());
var GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "https://localhost:3000/google/callback",
    passReqToCallback:true,
  },
  async function(accessToken, refreshToken, profile, cb) {
    // User.findOrCreate({ googleId: profile.id }, function (err, user) {
    //   return cb(err, user);
    // });

    try {
      // Check if user already exists in the database4
      console.log("google id-> ",profile._json.id);
      let user = await User.findOne({googleId:profile._json.email});

      if (!user) {
        // If user does not exist, create a new user
        const user_ = new User({
          googleId: profile.id,
        });
        await user_.save();
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  //User.findById(id, (err, user) => {
    done(err, user);
  //});
});