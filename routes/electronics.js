var express = require("express");
var dateFormat = require('dateformat');
var router = express.Router();
var Transaction = require("../models/transaction");
var Account = require("../models/account");
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
        .find({$and: [{type: "TE"},{ $or: searchArray}]})
        .populate("account")
        .sort({date: -1})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .exec(function(err, transactions) {
            if (err){
                req.flash("error", err);
            } else{
                Transaction.find({$and: [{type: "TE"},{ $or: searchArray}]}).count().exec(function(err, count) {
                    if (err) {
                        req.flash("error", err);
                    } else {
                        res.render('electronics/index', {
                            transactions: transactions,
                            current: page,
                            searching: search,
                            catalog: "electronics",
                            title: "Transferencia Electrónica",
                            addButton: "Nueva Transferencia",
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
    Account.find({type:{$in: ["Monetaria","Ahorro","Extrafinanciamiento","Tarjeta Crédito"]}}).sort({name: 1}).exec(function(err, accounts) {
        if (err){
                req.flash("error", err);
        } else {
            res.render("electronics/new",{
            accounts: accounts
            });
        }
    });
});

//CREATE 
router.post("/", middleware.isLoggedIn, function(req,res){
    Subcategory.find({name: {$in:["Transferencia Electrónica","Cuota de Extrafinanciamiento","Pago de Tarjeta"]}}).sort({sign: 1, name: 1}).populate("category").exec(function(err, subcategories){
        if (err){
            req.flash("error", "La subcategoría Transferencia Electrónica debe estar creada antes");
        } else {
            Account.find({_id: { $in:[req.body.accountFrom, req.body.accountTo]}}).exec(function(err, accounts){
                if (err){
                    req.flash("error", "Cuenta no encontrada");
                } else {
                    var categoryFrom, categoryTo, subcategoryFrom, subcategoryTo;
                    if(accounts[0].type == "Extrafinanciamiento" || accounts[1].type == "Extrafinanciamiento"){
                        categoryFrom = subcategories[0].category;
                        categoryTo = subcategories[3].category;
                        subcategoryFrom = subcategories[0];
                        subcategoryTo = subcategories[3];
                    } else {
                        if(accounts[0].type == "Tarjeta Crédito" || accounts[1].type == "Tarjeta Crédito"){
                            categoryFrom = subcategories[1].category;
                            categoryTo = subcategories[4].category;
                            subcategoryFrom = subcategories[1];
                            subcategoryTo = subcategories[4];
                        } else {
                            categoryFrom = subcategories[2].category;
                            categoryTo = subcategories[5].category;
                            subcategoryFrom = subcategories[2];
                            subcategoryTo = subcategories[5];
                        }
                    }
                    var accountFrom = req.body.accountFrom;
                    var accountTo = req.body.accountTo;
                    var accountNameFrom = req.body.accountFrom == accounts[0]._id ? accounts[0].name : accounts[1].name;
                    var accountNameTo = req.body.accountTo == accounts[0]._id ? accounts[0].name : accounts[1].name;
                    var dateFrom = dateFormat(req.body.dateFrom, "yyyymmdd");
                    var dateTo = dateFormat(req.body.dateTo, "yyyymmdd");
                    var total = req.body.total;
                    
                    var objectFrom = {
                        date: dateFrom,
                        type: "TE",
                        sign: -1,
                        category: categoryFrom,
                        subcategory: subcategoryFrom,
                        account: accountFrom,
                        total: total *100,
                        obs: "Transferencia electrónica de " + total * -1 + " para cuenta " + accountNameFrom + " en fecha " + req.body.dateFrom + " | " + req.body.obs
                    };
                    
                    var objectTo = {
                        date: dateTo,
                        type: "TE",
                        sign: 1,
                        category: categoryTo,
                        subcategory: subcategoryTo,
                        account: accountTo,
                        total: total *100,
                        obs: "Transferencia electrónica de " + total + " para cuenta " + accountNameTo + " en fecha " + req.body.dateTo + " | " + req.body.obs
                    };
                    
                    var object = [ objectFrom, objectTo ];
                    
                    Transaction.create(object, function(err,newElectronic){
                        if(err){
                            req.flash("error", err);
                        } else {
                            req.flash("success", "Transferencia electrónica guardada");
                            if(req.body.otro){
                                res.redirect("/electronics/new");    
                            } else {
                                res.redirect("/electronics/p=1/s=.");
                            }
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
                    res.render("electronics/edit",{
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
    Account.findOne({_id: req.body.transaction.account}).exec(function(err, accounts){
        if (err){
            req.flash("error", "Cuenta no encontrada");
        } else {
            var cuenta = accounts.name;
            var signo = req.body.transaction.total >= 0 ? 1 : -1;
            var total = req.body.transaction.total >= 0 ? req.body.transaction.total : req.body.transaction.total*-1;
            var fecha=dateFormat(req.body.transaction.date, "yyyymmdd");
            var object = {
                date: fecha,
                type: "TE",
                account: req.body.transaction.account,
                total: total*100,
                obs: "Transferencia electrónica de " + total * signo + " para cuenta " + cuenta + " en fecha " + req.body.transaction.date + " | " + req.body.obs
            }
            Transaction.findByIdAndUpdate(req.params.id,object,function(err,updatedSubcategory){
                if(err){
                    req.flash("error", err);
                } else {
                    req.flash("success", "Transferencia electrónica editada");
                    res.redirect("/electronics/p=1/s=.");
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
            req.flash("success", "Transferencia electrónica eliminada");
            res.redirect("/electronics/p=1/s=.");
        }
    });
});

module.exports = router;