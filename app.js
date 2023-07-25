require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require("lodash");
const encrypt = require("mongoose-encryption");

console.log(process.env.API_KEY);

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));

//Mongoose connection
mongoose.connect("mongodb://127.0.0.1:27017/userDB");

//Create a user Schema
const { Schema } = mongoose;

const userSchema = new mongoose.Schema({
   email: String,
    password: String
});

//encryption
//const secret = "Thisisourlittlesecretimean.";
//userSchema.plugin(encrypt, { secret: secret, encryptedFields:["password"] });
userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

//Create a model
const User = new mongoose.model("User", userSchema);

//Render our pages
//homepage
//app.get("/", function (req, res) {
   // res.render("home");
//});
app.get("/", async (req, res) => {
    try {
        res.render("home");
    }
    catch (err) {
        res.render(err);
    }
})

//register page
//app.get("/register", function (req, res) {
   // res.render("register");
//});
app.get("/register", async (req, res) => {
    try {
        res.render("register");
    }
    catch (err) {
        res.render(err);
    }
})


//login page
//app.get("/login", function (req, res) {
 //   res.render("login");
//});
app.get("/login", async (req, res) => {
    try {
        res.render("login");
    }
    catch (err) {
        res.render(err);
    }
})

app.post("/register", async (req, res) => {
    try {
        const newUser = new User({
            email: req.body.username,
            password: req.body.password
        })
        await newUser.save();
        res.render("secrets");
    }
    catch (err) {
        res.send(err);
    }
});

app.post("/login", async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;

        const foundUser = await User.findOne(
            { email: username }
        )
        if (foundUser) {
            if (foundUser.password === password) {
                res.render("secrets");
            }
            else {
                res.send("Wrong password, please try again");
            }
        }
        else {
            res.send("No matching username found, please try again.");
        }
    }
    catch (err) {
        res.send(err);
    }
})
app.listen(3000, function () {
    console.log("Server started on port 3000");
});
