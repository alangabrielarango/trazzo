var express = require("express");
var dateFormat = require('dateformat');
var router = express.Router();
var Transaction = require("../models/transaction");
var Account = require("../models/account");
var Check = require("../models/check");
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
    ];
  Transaction
        .find({$and: [{type: {$in:["ME","DE"]}},{ $or: searchArray}]})
        .populate("account check contact")
        .sort({date: -1})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .exec(function(err, transactions) {
            if (err){
                req.flash("error", err);
            } else{
                Transaction.find({$and: [{type: {$in:["ME","DE"]}},{ $or: searchArray}]}).count().exec(function(err, count) {
                    if (err) {
                        req.flash("error", err);
                    } else {
                        
                        res.render('atms/index', {
                            transactions: transactions,
                            current: page,
                            searching: search,
                            catalog: "atms",
                            title: "Retiro de Efectivo",
                            addButton: "Nuevo Retiro",
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
    Account.find({type:{$in: ["Monetaria","Ahorro","Efectivo"]}}).populate("contact").sort({name: 1}).exec(function(err, accounts) {
        if (err){
                req.flash("error", err);
        } else {
            //console.log(accounts);
            Check.find().sort({number: 1}).exec(function(err, checks){
                if (err){
                        req.flash("error", err);
                } else {
                    res.render("atms/new",{
                        accounts: accounts,
                        checks: checks
                    });
                }
            });
        }
    });
});

//CREATE 
router.post("/", middleware.isLoggedIn, function(req,res){
    Subcategory.find({name: "Retiro de Efectivo"}).sort({sign: 1}).populate("category").exec(function(err, subcategories){
        if (err){
            req.flash("error", "La subcategoría Retiro de Efectivo debe estar creada antes");
        } else {
            Account.find({_id: { $in:[req.body.accountFrom, req.body.accountTo]}}).populate("contact").exec(function(err, accounts){
                if (err){
                    req.flash("error", "Cuenta no encontrada");
                } else {
                    var categoryFrom = subcategories[0].category;
                    var categoryTo = subcategories[1].category;
                    var subcategoryFrom = subcategories[0];
                    var subcategoryTo = subcategories[1];
                    var accountFrom = req.body.accountFrom;
                    var accountTo = req.body.accountTo;
                    var accountNameFrom = req.body.accountFrom == accounts[0]._id ? accounts[0].name : accounts[1].name;
                    var accountNameTo = req.body.accountTo == accounts[0]._id ? accounts[0].name : accounts[1].name;
                    var date = req.body.date ? dateFormat(req.body.date, "yyyymmdd") : "";
                    var finalDate = req.body.finalDate ? dateFormat(req.body.finalDate, "yyyymmdd") : "";
                    finalDate = finalDate = "" && req.body.type !== "check" ? dateFormat(req.body.finalDate, "yyyymmdd") : finalDate;
                    var total = req.body.total;
                    var conceptDev = "Devolución de efectivo de " + total * -1 + " desde cuenta " + accountNameTo + " a cuenta " + accountNameFrom + " en fecha " + req.body.finalDate;
                    var conceptDate = req.body.type == "check" ? req.body.date : req.body.finalDate;
                    var conceptOther= "Retiro de efectivo de " + total * -1 + " desde cuenta " + accountNameFrom + " a cuenta " + accountNameTo + " en fecha " + conceptDate;
                    
                    var objectFrom = {
                        date: req.body.type == "check" ? date : finalDate,
                        type: req.body.type == "dev" ? "DE" : "ME",
                        sign: -1,
                        category: categoryFrom,
                        subcategory: subcategoryFrom,
                        account: req.body.type == "dev" ? accountTo : accountFrom,
                        total: total *100,
                        check: req.body.check,
                        obs: req.body.type == "dev" ?  conceptDev : conceptOther
                    };
                    
                    var objectTo = {
                        date: req.body.type == "check" ? date : finalDate,
                        type: req.body.type == "dev" ? "DE" : "ME",
                        sign: 1,
                        category: categoryTo,
                        subcategory: subcategoryTo,
                        account: req.body.type == "dev" ? accountFrom : accountTo,
                        total: total *100,
                        check: req.body.check,
                        obs: req.body.type == "dev" ?  conceptDev : conceptOther
                    };
                    
                    var object = [ objectFrom, objectTo ];
                    
                    Transaction.create(object, function(err,newElectronic){
                        if(err){
                            req.flash("error", err);
                        } else {
                            req.flash("success", "Transferencia electrónica guardada");
                            if(req.body.type == "check"){
                                Check.findOne({_id:req.body.check},function(err,checkFound){
                                    if(err){
                                        req.flash("error", err);
                                    } else {
                                        var dateCheck = checkFound.date ? checkFound.date : date;
                                        var checkNameTo = req.body.accountTo == accounts[0]._id ? accounts[0].contact.name : accounts[1].contact.name;
                                        var nameCheck = checkFound.name ? checkFound.name : checkNameTo;
                                        var conceptCheck = checkFound.concept ? checkFound.concept : req.body.concept;
                                        var totalCheck = checkFound.total ? checkFound.total : req.body.total *100;
                                        
                                        
                                        var objectCheck = {
                                            date : dateCheck,
                                            name : nameCheck,
                                            concept : conceptCheck,
                                            total: totalCheck,
                                            finalDate: finalDate
                                        };
                                        
                                        Check.findByIdAndUpdate(checkFound._id,objectCheck,function(err,updatedCheck){
                                            if(err){
                                                req.flash("error", err);
                                            } else {
                                                req.flash("success", "Cheque editado");
                                                if(req.body.otro){
                                                    res.redirect("/atms/new");    
                                                } else {
                                                    res.redirect("/atms/p=1/s=.");
                                                }
                                            }
                                        });
                                    }
                                });
                            } else {
                                if(req.body.otro){
                                    res.redirect("/atms/new");    
                                } else {
                                    res.redirect("/atms/p=1/s=.");
                                }
                            }
                        }
                    }); 
                }
            });
        }
    });
});

// //EDIT
// router.get("/:id/edit", middleware.isLoggedIn, function(req,res){
//     Transaction.findById(req.params.id).populate("account check").exec(function(err,foundTransaction){
//         if (err) {
//             req.flash("error", err);
//         } else {
//             if (!foundTransaction) {
//                 req.flash("error", "Dato no encontrado");
//             }
//             Account.find({}).sort({name: 1}).exec(function(err, accounts) {
//                 if (err){
//                         req.flash("error", err);
//                 } else {
//                     Check.find().sort({number: 1}).exec(function(err, checks){
//                         if (err){
//                                 req.flash("error", err);
//                         } else {
//                             res.render("atms/edit",{
//                                 accounts: accounts,
//                                 checks: checks,
//                                 transaction: foundTransaction
//                             });
//                         }
//                     });
//                 }
//             });
//         }
//     });
// });

// //UPDATE
// router.put("/:id", middleware.isLoggedIn, function(req,res){
//     Account.findOne({_id: req.body.transaction.account}).exec(function(err, accounts){
//         if (err){
//             req.flash("error", "Cuenta no encontrada");
//         } else {
//             var cuenta = accounts.name;
//             var signo = req.body.transaction.total >= 0 ? 1 : -1;
//             var total = req.body.transaction.total >= 0 ? req.body.transaction.total : req.body.transaction.total*-1;
//             var fecha=dateFormat(req.body.transaction.date, "yyyymmdd");
//             var object = {
//                 date: fecha,
//                 type: "TE",
//                 account: req.body.transaction.account,
//                 total: total*100,
//                 obs: "Transferencia electrónica de " + total * signo + " para cuenta " + cuenta + " en fecha " + req.body.transaction.date
//             }
//             Transaction.findByIdAndUpdate(req.params.id,object,function(err,updatedSubcategory){
//                 if(err){
//                     req.flash("error", err);
//                 } else {
//                     req.flash("success", "Transferencia electrónica editada");
//                     res.redirect("/electronics/p=1/s=.");
//                 }
//             });
//         }
//     });
// });

//DESTROY
router.delete("/:id",middleware.isLoggedIn,function(req,res){
    Transaction.findByIdAndRemove(req.params.id,function(err){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Retiro de efectivo eliminado");
            res.redirect("/atms/p=1/s=.");
        }
    });
});

module.exports = router;