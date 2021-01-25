var express = require("express");
var dateFormat = require('dateformat');
var router = express.Router();
var Transaction = require("../models/transaction");
var Account = require("../models/account");
var Category = require("../models/category");
var Subcategory = require("../models/subcategory");
var middleware = require("../middleware");
var numeral = require('numeral');

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
            {obs:  regexArray}
    ]
   Transaction
        .find({$and: [{type: "SI"},{ $or: searchArray}]})
        .populate("category subcategory account")
        .sort({date: 1})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .exec(function(err, transactions) {
            if (err){
                req.flash("error", err);
            } else{
                Transaction.find({$and: [{type: "SI"},{ $or: searchArray}]}).count().exec(function(err, count) {
                    if (err) {
                        req.flash("error", err);
                    } else {
                        res.render('origins/index', {
                            transactions: transactions,
                            current: page,
                            searching: search,
                            catalog: "origins",
                            title: "Saldos Iniciales",
                            addButton: "Nuevo Saldo Inicial",
                            numeral:numeral,
                            pages: Math.ceil(count / perPage)
                        });
                    }
                });
            }
        });
});

//NEW 
router.get("/new", middleware.isLoggedIn, function(req,res){
    Account.find({}).sort({name: 1}).exec(function(err, accounts) {
        if (err){
                req.flash("error", err);
        } else {
            res.render("origins/new",{
                accounts: accounts
            });
        }
    });
});

//CREATE 
router.post("/", middleware.isLoggedIn, function(req,res){
    Subcategory.find({name: "Gasto Inicial"}).populate("category").exec(function(err, subcategoriesG){
        if (err){
            req.flash("error", "La categoría Otros Gastos y subcategoría Gasto Inicial, deben estar creadas antes");
        } else {
            var subcategoriaGasto = subcategoriesG[0];
            Subcategory.find({name: "Saldo Inicial"}).populate("category").exec(function(err, subcategoriesI){
                if (err){
                    req.flash("error", "La categoría Otros Ingresos y subcategoría Saldo Inicial, deben estar creadas antes");
                } else {
                    var subcategoriaIngreso = subcategoriesI[0];
                    Account.find({_id: req.body.transaction.account}).exec(function(err, accounts){
                        if (err){
                            req.flash("error", "Cuenta no encontrada");
                        } else {
                            var cuenta = accounts[0].name;
                            var subcategoriaIngreso = subcategoriesI[0];
                            var signo = req.body.transaction.total >= 0 ? 1 : -1;
                            var total = req.body.transaction.total >= 0 ? req.body.transaction.total : req.body.transaction.total*-1;
                            var subcategoria = signo == 1 ? subcategoriaIngreso : subcategoriaGasto;
                            var fecha=dateFormat(req.body.transaction.date, "yyyymmdd");
                            var object = {
                                date: fecha,
                                type: "SI",
                                sign: signo,
                                category: subcategoria.category,
                                subcategory: subcategoria,
                                account: req.body.transaction.account,
                                total: total*100,
                                obs: "Saldo inicial de " + total * signo + " para cuenta " + cuenta + " en fecha " + req.body.transaction.date
                            }
                            Transaction.create(object, function(err,newOrigin){
                                if(err){
                                    req.flash("error", err);
                                } else {
                                    req.flash("success", "Saldo inicial guardado");
                                    if(req.body.otro){
                                        res.redirect("/origins/new");    
                                    } else {
                                        res.redirect("/origins/p=1/s=.");
                                    }
                                }
                            }); 
                        }
                    });
                }
            });
        }
    });
});

//EDIT
router.get("/:id/edit", middleware.isLoggedIn, function(req,res){
    Transaction.findById(req.params.id).populate("account").exec(function(err,foundTransaction){
        if (err) {
            req.flash("error", err);
        } else {
            if (!foundTransaction) {
                req.flash("error", "Dato no encontrado");
            }
            Account.find({}).sort({name: 1}).exec(function(err, accounts) {
                if (err){
                        req.flash("error", err);
                } else {
                    res.render("origins/edit",{
                        transaction:foundTransaction,
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
    Subcategory.find({name: "Gasto Inicial"}).populate("category").exec(function(err, subcategoriesG){
        if (err){
            req.flash("error", "La categoría Otros Gastos y subcategoría Gasto Inicial, deben estar creadas antes");
        } else {
            var subcategoriaGasto = subcategoriesG[0];
            Subcategory.find({name: "Saldo Inicial"}).populate("category").exec(function(err, subcategoriesI){
                if (err){
                    req.flash("error", "La categoría Otros Ingresos y subcategoría Saldo Inicial, deben estar creadas antes");
                } else {
                    var subcategoriaIngreso = subcategoriesI[0];
                    Account.find({_id: req.body.transaction.account}).exec(function(err, accounts){
                        if (err){
                            req.flash("error", "Cuenta no encontrada");
                        } else {
                            var cuenta = accounts[0].name;
                            var subcategoriaIngreso = subcategoriesI[0];
                            var signo = req.body.transaction.total >= 0 ? 1 : -1;
                            var total = req.body.transaction.total >= 0 ? req.body.transaction.total : req.body.transaction.total*-1;
                            var subcategoria = signo == 1 ? subcategoriaIngreso : subcategoriaGasto;
                            var fecha=dateFormat(req.body.transaction.date, "yyyymmdd");
                            var object = {
                                date: fecha,
                                type: "SI",
                                sign: signo,
                                category: subcategoria.category,
                                subcategory: subcategoria,
                                account: req.body.transaction.account,
                                total: total*100,
                                obs: "Saldo inicial de " + total * signo + " para cuenta " + cuenta + " en fecha " + req.body.transaction.date
                            }
                            Transaction.findByIdAndUpdate(req.params.id,object,function(err,updatedSubcategory){
                                if(err){
                                    req.flash("error", err);
                                } else {
                                    req.flash("success", "Saldo inicial editado");
                                    res.redirect("/origins/p=1/s=.");
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

//DESTROY
router.delete("/:id",middleware.isLoggedIn,function(req,res){
    Transaction.findByIdAndRemove(req.params.id,function(err){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Saldo inicial eliminado");
            res.redirect("/origins/p=1/s=.");
        }
    });
});

module.exports = router;