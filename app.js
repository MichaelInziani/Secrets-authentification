// JavaScript source code
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require("lodash");
const session = require("express-session");
const passport = require("passport");
const PassportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const GitHubStrategy = require('passport-github').Strategy;
const findOrCreate = require('mongoose-findorcreate')

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));

app.use(session({
    secret: "Our little secret is here.",
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

//Mongoose connection
//mongoose.connect("mongodb://127.0.0.1:27017/userDB");
//mongoose.connect(process.env.MONGO_CONNECT);
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}


//Create a user Schema
const { Schema } = mongoose;

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String,
    facebookId: String,
    githubId: String
});

userSchema.plugin(PassportLocalMongoose);
userSchema.plugin(findOrCreate);

//Create a model
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        cb(null, { id: user.id, username: user.username, name: user.name });
    });
});
passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

//Configure Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    userProfileURL: process.env.GOOGLE_USERPROFILE_URL
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({ username: profile.displayName, googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

//Configure facebook strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL,
    //enableProof:true 
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({ username: profile.displayName, facebookId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

//Configure Github Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL
},
    function (accessToken, refreshToken, profile, done) {
        console.log(profile);
        User.findOrCreate({ username: profile.displayName, githubId: profile.id }, function (err, user) {
            return done(err, user);
        });
    }
));

//Google Authenticate
app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function (req, res) {
        // Successful authentication, redirect to secrets page.
        res.redirect("/secrets");
    });

//Facebook Authenticate
app.get("/auth/facebook",
    passport.authenticate("facebook", { scope: ["public_profile"] }));

app.get("/auth/facebook/secrets",
    passport.authenticate("facebook", { failureRedirect: "/login" }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect("/secrets");
    });


//Github Authenticate Requests
app.get("/auth/github",
    passport.authenticate("github", { scope: ["user:email"] }));

app.get("/auth/github/secrets",
    passport.authenticate("github", { failureRedirect: "/login" }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect("/secrets");
    });

app.route("/register")
    .get(async (req, res) => {
        try {
            res.render("register");
        }
        catch (err) {
            res.render(err);
        }
    })
    .post(async (req, res) => {
        try {
            const registerUser = await User.register(
                { username: req.body.username }, req.body.password
            );

            if (registerUser) {
                passport.authenticate("local")(req, res, function () {
                    res.redirect("/secrets");
                });
            }

        } catch (err) {
            console.log(err);
            // res.send('<script>alert("A user with the given username exists, please login")</script>');
            await res.redirect("/login");
        }
    });


//login page
app.route("/login")
    .get(async (req, res) => {
        try {
            res.render("login");
        }
        catch (err) {
            res.render(err);
        }
    })
    .post(async (req, res) => {
        try {
            const user = new User({
                username: req.body.username,
                password: req.body.password
            });


            req.login(user, (err) => {
                if (err) {
                    console.log(err);

                } else {
                    passport.authenticate("local")(req, res, function () {
                        res.redirect("/secrets");

                    });
                }
            })

        } catch (err) {
            console.log(err);
        }
    });



app.route("/submit")
    .get(async (req, res) => {
        try {
            if (req.isAuthenticated()) {
                res.render("submit");
            }
            else {
                res.redirect("/login");
            }
        } catch (err) {
            res.send(err);
        }
    })

    .post(async (req, res) => {
        try {
            const submittedSecret = req.body.secret
            const userId = req.user.id
            const foundUser = User.findOne({ id: userId })
            console.log(req.user.id);

            User.findById(req.user.id)
                .then((foundUser) => {
                    if (foundUser) {
                        foundUser.secret = submittedSecret;
                        foundUser.save()
                            .then(() => {
                                res.redirect("/secrets");
                            })
                            .catch((err) => {
                                console.log(err);
                            });
                    }
                });

        }
        catch (err) {
            console.log(err);
        }
    });

app.get("/", async (req, res) => {
    try {
        res.render("home");
    }
    catch (err) {
        res.render(err);
    }
});

app.get("/secrets", async (req, res) => {
    try {
        User.find({ secret: { $exists: true, $ne: null } }).then((foundUsers) => {
            if (foundUsers) {
                res.render("secrets", { usersWithSecrets: foundUsers });
            }
        });
    } catch (err) {
        console.log(err);
    }
});

app.get("/logout", async (req, res) => {
    try {
        req.logout(function (err) {
            if (err) {
                return next(err);
            }
            else {
                res.redirect("/");
            }
        });
    } catch (err) {
        res.send(err);
    }
});

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log("listening for requests");
    })
})