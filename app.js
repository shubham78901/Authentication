//jshint esversion:6

require('dotenv').config();
const express=require('express');
//const md5=require('md5');

const bodyParser=require('body-parser');

const ejs=require('ejs');

const mongoose=require('mongoose');
//  const encrypt=require("mongoose-encryption");


const passport=require("passport");

const passportLocalMongoose=require("passport-local-mongoose");
const findOrCreate = require('mongoose-findorcreate')


const session = require('express-session')

const app = express();
// const bcrypt = require('bcrypt');
const saltRounds = 11;

const GoogleStrategy = require('passport-google-oauth20').Strategy;

// const findOrCreate = require('mongoose-findorcreate');

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));


app.use(session({
    secret: 'thisishacking',
    resave: false,
    saveUninitialized: true,
    // cookie: { secure: true }
  }))

  app.use(passport.initialize());
  app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true});

mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
  secret: String
  
  });


//   userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});


  userSchema.plugin(passportLocalMongoose);
   userSchema.plugin(findOrCreate);
  
  const User = new mongoose.model("User", userSchema);
  
  passport.use(User.createStrategy());
  
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });


  passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile)
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });


app.get('/',(req,res)=>
{
    res.render('home');
})
app.get("/logout",(req,res)=>
{

  req.logout();
  res.redirect('/');

})

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;

//Once the user is authenticated and their session gets saved, their user details are saved to req.user.
   console.log(req.user.id);

  User.findById(req.user.id, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});


app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });



app.get('/login',(req,res)=>
{
    res.render('login');
})
app.get('/register',(req,res)=>
{
    res.render('register');
})



app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
});


app.post('/register',function(req,res)
{
  
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });
    
  
});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});


app.listen(3000,()=>
{

    console.log("Server Started at 3000...")

})