var express = require("express");
var router = express.Router();
var passport = require("passport");
var User = require("../models/user");
var middleware = require("../middleware");

router.get("/", function(req,res){
    res.render("home");
});

//LOGIN FORM
router.get("/login", function(req,res){
    res.render("login");
});

//REGISTER NEW USER
router.get("/register", middleware.isLoggedIn, function(req,res){
    res.render("register");
});

//CREATE NEW USER
router.post("/register", middleware.isLoggedIn, function(req,res){
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function(err,user){
        if(err){
            req.flash("error", "El usuario ya existe. Intente un nuevo nombre de usuario.");
            return res.redirect("/register");
        }
        passport.authenticate("local")(req, res, function(){
            req.flash("success","Bienvenido a Trazzo "+ user.username);
            res.redirect("/");
        });
    });
});

//LOGIN WITH USER AND PASSWORD
router.post("/login", passport.authenticate("local",
    {
        successRedirect: "/",
        failureRedirect: "/login"
    }), function(req,res){});

//LOGOUT
router.get("/logout", function(req,res){
    req.logout();
    req.flash("success", "Hasta luego!");
    res.redirect("/");
});

module.exports = router;