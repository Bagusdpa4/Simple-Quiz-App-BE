const passport = require("passport");
const prisma = require("../libs/db");

const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL } =
  process.env;

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_REDIRECT_URL,
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        const userEmail = profile.emails?.[0]?.value;

        if (userEmail) {
          let user = await prisma.user.upsert({
            where: { email: userEmail },
            update: {
              google_id: profile.id,
              profile: {
                update: {
                  avatar_url: profile.photos?.[0]?.value || null,
                },
              },
            },
            create: {
              fullname: profile.displayName,
              email: userEmail,
              google_id: profile.id,
              profile: {
                create: {
                  city: "", // Default string sesuai skema
                  avatar_url: profile.photos?.[0]?.value || null,
                  birth_date: "", 
                },
              },
            },
            include: {
              profile: true,
            },
          });

          return done(null, user);
        } else {
          return done(new Error("No email found in Google profile"), null);
        }
      } catch (error) {
        console.error("Passport Google Strategy Error:", error);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;
