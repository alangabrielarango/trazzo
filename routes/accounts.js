var express = require("express");
var router = express.Router();
var Account = require("../models/account");
var Contact = require("../models/contact");
var middleware = require("../middleware");

//INDEX REDIRECT WITH SEARCH
router.post('/p=:page', middleware.isLoggedIn, function(req,res){
    var search = req.body.searchText || ".";
   res.redirect('p='+req.params.page+'/s='+search) ;
});

//INDEX WITH PAGINATION AND SEARCH
router.get('/p=:page/s=:searchText', middleware.isLoggedIn, function(req, res) {
    
    var search = req.params.searchText || ".";
    var perPage = 10;
    var page = req.params.page || 1;
    var regexArray = {"$regex": ".*" + search + ".*" , "$options": 'i'};
    var searchArray = [
            {name:  regexArray},
            {type:  regexArray},
            {bank:  regexArray},
            {number:  regexArray}
    ]
   Account
        .find({ $or: searchArray})
        .populate("contact")
        .sort({name: 1})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .exec(function(err, accounts) {
            if (err){
                req.flash("error", err);
            } else{
                Account.find({ $or: searchArray}).count().exec(function(err, count) {
                    if (err) {
                        req.flash("error", err);
                    } else {
                        res.render('accounts/index', {
                            accounts: accounts,
                            current: page,
                            searching: search,
                            catalog: "accounts",
                            title: "Cuentas",
                            addButton: "Nueva Cuenta",
                            pages: Math.ceil(count / perPage)
                        });
                    }
                });
            }
        });
});

//NEW 
router.get("/new", middleware.isLoggedIn, function(req,res){
    Contact.find({hasAccount : true}).sort({name: 1}).exec(function(err, contacts) {
        if (err){
                req.flash("error", err);
        } else {
            res.render("accounts/new",{
                contacts: contacts
            });
        }
    })
});

//CREATE 
router.post("/", middleware.isLoggedIn, function(req,res){
    Account.create(req.body.account, function(err,newAccount){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Cuenta guardada");
            if(req.body.otro){
                res.redirect("/accounts/new");    
            } else {
                res.redirect("/accounts/p=1/s=.");
            }
        }
    });   
});

//EDIT
router.get("/:id/edit", middleware.isLoggedIn, function(req,res){
    Account.findById(req.params.id).populate("contact").exec(function(err,foundAccount){
        if (err) {
            req.flash("error", err);
        } else {
            if (!foundAccount) {
                req.flash("error", "Dato no encontrado");
            }
            Contact.find({hasAccount : true}).sort({name: 1}).exec(function(err, contacts) {
                if (err){
                        req.flash("error", err);
                } else {
                    res.render("accounts/edit",{
                        account:foundAccount,
                        contacts: contacts
                    });
                }
            });
        }
    });
});

//UPDATE
router.put("/:id", middleware.isLoggedIn, function(req,res){
    Account.findByIdAndUpdate(req.params.id,req.body.account,function(err,updatedAccount){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Cuenta editada");
            res.redirect("/accounts/p=1/s=.");
        }
    });
});

//DESTROY
router.delete("/:id",middleware.isLoggedIn,function(req,res){
    Account.findByIdAndRemove(req.params.id,function(err){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Cuenta eliminada");
            res.redirect("/accounts/p=1/s=.");
        }
    });
});

router.post("/list", middleware.isLoggedIn, function(req, res) {
   Account.find({}).sort({name: 1}).exec(function(err, accounts) {
        if (err){
                req.flash("error", err);
        } else {
            var opciones = "";
            accounts.forEach(function(account){
                opciones += "<option value='" + account._id + "'>" + account.name + "</option>";
            });
            res.send(opciones);
        }
    }); 
});

module.exports = router;