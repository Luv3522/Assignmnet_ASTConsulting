const LocalStrategy = require("passport-local").Strategy;
const User = require("./models/users");
module.exports = (passport) => {
 passport.use(
   "local-signup",
   new LocalStrategy(
     {
       usernameField: "username",
       passwordField: "password",
     },
     async (username, password, done) => {
       try {
         // check if user exists
         const userExists = await User.findOne({ "username": username });
         if (userExists) {
           return done(null, false)
         }
         // Create a new user with the user data provided
         const user = await User.create({ username, password });
         return done(null, user);
       } catch (error) {
         done(error);
       }
     }
   )
 );

 passport.use(
    "local-login",
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await User.findOne({ email: email });
          if (!user) return done(null, false);
          const isMatch = await user.matchPassword(password);
          if (!isMatch)
            return done(null, false);
          // if passwords match return user
          return done(null, user);
        } catch (error) {
          console.log(error)
          return done(error, false);
        }
      }
    )
  );
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromHeader("authorization"),
        secretOrKey: "secretKey",
      },
      async (jwtPayload, done) => {
        try {
          // Extract user
          const user = jwtPayload.user;
          done(null, user);
        } catch (error) {
          done(error, false);
        }
      }
    )
  );
 };
