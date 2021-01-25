var express = require("express");
var dateFormat = require('dateformat');
var router = express.Router();
var Check = require("../models/check");
var Account = require("../models/account");
var middleware = require("../middleware");
var numeral = require('numeral');
var async = require('async');

var funciones = {};

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
            {number:  regexArray},
            {name:  regexArray},
            {concept:  regexArray}
    ];
    
    Check  
        .find({ $or: searchArray})
        .populate("account")
        .sort({date: -1, number: 1})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .exec(function(err, checks) {
            if (err){
                req.flash("error", err);
            } else{
                Check.find({ $or: searchArray}).count().exec(function(err, count) {
                    if (err) {
                        req.flash("error", err);
                    } else {
                        res.render('checks/index', {
                            checks: checks,
                            current: page,
                            searching: search,
                            catalog: "checks",
                            title: "Chequera",
                            addButton: "Nueva Chequera",
                            pages: Math.ceil(count / perPage),
                            numeral: numeral
                        });
                    }
                });
            }
        });
});

//NEW 
router.get("/new", middleware.isLoggedIn, function(req,res){
    Account.find({type: "Monetaria"}).sort({name: 1}).exec(function(err, accounts) {
        if (err){
                req.flash("error", err);
        } else {
            res.render("checks/new",{
                accounts: accounts
            });
        }
    });
});

//CREATE 
router.post("/", middleware.isLoggedIn, function(req,res){
    var initial = Number(req.body.check.initial);
    var final = Number(req.body.check.final);
    var checksNotCreated = "";
    if(final>=initial){
        var objArr = [];
        for(var i = initial; i<= final; i++){
            objArr.push(i);
        }
        async.each(objArr, function(object, callback){
            Check.count({number:object}, function(err,count){
                if(err){
                    callback(err);
                } else {
                    if(count>0){
                        checksNotCreated += object + " ";
                        callback();
                    } else {
                        var nuevo = {
                            account: req.body.check.account,
                            number: object
                        };
                        Check.create(nuevo, function(err,newCheck){
                            if(err){
                                callback(err);
                            } else {
                                callback();
                            }
                        });
                    }
                }
               
            });
        }, function(err){
            if(err){
                req.flash("error", err);    
            } else {
                var message = checksNotCreated=="" ? "Cheques guardados" : "Cheques guardados. Los cheques: " + checksNotCreated + " ya existían previamente y no fueron creados de nuevo.";
                req.flash("success", message);
                if(req.body.otro){
                    res.redirect("/checks/new");    
                } else {
                    res.redirect("/checks/p=1/s=.");
                }      
            }
        });
    } else {
        req.flash("error", "El número final debe ser mayor o igual que el número inicial");
        res.redirect("/checks/new");  
    }
});

//EDIT
router.get("/:id/edit", middleware.isLoggedIn, function(req,res){
    Check.findById(req.params.id).populate("account").exec(function(err,foundCheck){
        if (err) {
            req.flash("error", err);
        } else {
            if (!foundCheck) {
                req.flash("error", "Dato no encontrado");
            }
            Account.find({type : "Monetaria"}).sort({name: 1}).exec(function(err, accounts) {
                if (err){
                        req.flash("error", err);
                } else {
                    res.render("checks/edit",{
                        check:foundCheck,
                        accounts: accounts,
                        numeral: numeral
                    });
                }
            });
        }
    });
});

//UPDATE
router.put("/:id", middleware.isLoggedIn, function(req,res){
    var fecha= req.body.check.date ? dateFormat(req.body.check.date, "yyyymmdd") : "";
    var fechaFinal = req.body.check.finalDate ? dateFormat(req.body.check.finalDate, "yyyymmdd") : "";
    var object = {
        account: req.body.check.account,
        number: req.body.check.number,
        date: fecha,
        name: req.body.check.name,
        concept: req.body.check.concept,
        finalDate: fechaFinal,
        total: req.body.check.total*100
    }
    Check.findByIdAndUpdate(req.params.id,object,function(err,updatedCheck){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Cheque editado");
            res.redirect("/checks/p=1/s=.");
        }
    });
});

//DESTROY
router.delete("/:id",middleware.isLoggedIn,function(req,res){
    Check.findByIdAndRemove(req.params.id,function(err){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Cheque eliminado");
            res.redirect("/checks/p=1/s=.");
        }
    });
});

router.post("/list", middleware.isLoggedIn, function(req, res) {
   Check.find({account : req.body.seleccion}).sort({number: 1}).exec(function(err, checks) {
        if (err){
                req.flash("error", err);
        } else {
            var opciones = "<option value=''>SIN CHEQUE</option>";
            checks.forEach(function(check){
                opciones += "<option value='" + check._id + "'>" + check.number + "</option>"
            });
            res.send(opciones);
        }
    }); 
});

module.exports = router;