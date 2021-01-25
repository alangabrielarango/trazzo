var express = require("express");
var dateFormat = require('dateformat');
var router = express.Router();
var Transaction = require("../models/transaction");
var Company = require("../models/company");
var Proyect = require("../models/proyect");
var Account = require("../models/account");
var Category = require("../models/category");
var Subcategory = require("../models/subcategory");
var Check = require("../models/check");
var Contact = require("../models/contact");
var Invoice = require("../models/invoice");
var middleware = require("../middleware");
var numeral = require('numeral');
var moment = require("moment");
//var async = require('async');

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
        .find({$and: [{type: "TD"},{ $or: searchArray}]})
        .populate("category subcategory account company check proyect")
        .populate({path: "invoice", populate: {path: "contact"}})
        .sort({date: -1})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .exec(function(err, transactions) {
            if (err){
                req.flash("error", err);
            } else{
                Transaction.find({$and: [{type: "TD"},{ $or: searchArray}]}).count().exec(function(err,count){
                    if (err) {
                        req.flash("error", err);
                    } else {
                        res.render('transactions/index', {
                            transactions: transactions,
                            
                            current: page,
                            searching: search,
                            catalog: "transactions",
                            title: "Transacciones",
                            addButton: "Nueva Transacción",
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
    Category.find({}).sort({name: 1}).exec(function(err, categories) {
        if (err){
                req.flash("error", err);
        } else {
            Subcategory.find({}).sort({name: 1}).exec(function(err, subcategories) {
                if (err){
                        req.flash("error", err);
                } else {
                    Account.find({}).sort({name: 1}).exec(function(err, accounts) {
                        if (err){
                                req.flash("error", err);
                        } else {
                            Check.find({}).sort({number: 1}).exec(function(err, checks) {
                                if (err){
                                        req.flash("error", err);
                                } else {
                                    Company.find({}).sort({name: 1}).exec(function(err, companies) {
                                        if (err){
                                                req.flash("error", err);
                                        } else {
                                            Proyect.find({status: "En Ejecución"}).sort({name: 1}).exec(function(err, proyects) {
                                                if (err){
                                                        req.flash("error", err);
                                                } else {
                                                    Contact.find({$and:[{nit:{$ne:null}},{$or:[{isProvider: true},{isWorker:true}]}]}).sort({nit: 1}).exec(function(err, contacts) {
                                                        if (err){
                                                                req.flash("error", err);
                                                        } else {
                                                            
                                                            res.render("transactions/new",{
                                                                categories: categories,
                                                                subcategories: subcategories,
                                                                accounts: accounts,
                                                                checks: checks,
                                                                companies: companies,
                                                                proyects: proyects,
                                                                contacts: contacts
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

function crearFactura(transaction, req, fecha, newTransaction){
    Invoice.findOne({$and:[{serial:transaction.serial},{number:transaction.number},{contact:transaction.contact}]}, function(err,foundInvoice){
        if(err){
            req.flash("error", err);
            return false;
        } else {
            if(!foundInvoice){
                var object = {
                    date: fecha,
                    contact: transaction.contact,
                    serial: transaction.serial,
                    number: transaction.number,
                    total: transaction.total *100,
                    include: true
                };
                
                Invoice.create(object, function(err, newInvoice){
                    if(err){
                        req.flash("error", err);
                        return false;
                    } else {
                        var updateObject = {
                            invoice: newInvoice
                        };
                        Transaction.findByIdAndUpdate(newTransaction,updateObject,function(err,updatedSubcategory){
                            if(err){
                                req.flash("error", err);
                                return false;
                            } else {
                                return true;
                            }
                        });
                    }
                });
            } else {
                var updateObject = {
                    invoice: foundInvoice
                };
                
                Transaction.findByIdAndUpdate(newTransaction,updateObject,function(err,updatedSubcategory){
                    if(err){
                        req.flash("error", err);
                        return false;
                    } else {
                        return true;
                    }
                });    
            }
        }
    });
}

function quitarFactura(req,updatedTransaction){
    var updateObject = {
        $unset : {invoice : ""}
    }
    Transaction.findByIdAndUpdate(updatedTransaction,updateObject,function(err,updatedSubcategory){
        if(err){
            req.flash("error", err);
            return false;
        } else {
            return true;
        }
    });      
}

//CREATE 
router.post("/", middleware.isLoggedIn, function(req,res){
    var fecha=dateFormat(req.body.transaction.date, "yyyymmdd");
    var cheque = req.body.transaction.check ? req.body.transaction.check : "";
    var proyecto = req.body.transaction.proyect ? req.body.transaction.proyect : "";
    var cuenta = req.body.transaction.account;
    var factura = req.body.transaction.serial && req.body.transaction.number ? req.body.transaction.serial + " " + req.body.transaction.number : "";
    Account.findOne({_id:cuenta},function(err,accountFound){
        if(err){
            req.flash("error", err);
        } else {
            var object = {
                date: fecha,
                type: "TD",
                sign: req.body.transaction.sign,
                category: req.body.transaction.category,
                subcategory: req.body.transaction.subcategory,
                account: req.body.transaction.account,
                company: req.body.transaction.company,
                total: req.body.transaction.total *100,
                obs: "Transacción de " + req.body.transaction.total + " para cuenta " + accountFound.name + " en fecha " + req.body.transaction.date + " |" + req.body.transaction.obs + " " + factura 
            };  
            if(cheque) { object["check"] = cheque; }
            if(proyecto) { object["proyect"] = proyecto;}
            Transaction.create(object, function(err,newTransaction){
                if(err){
                    req.flash("error", err);
                } else {
                    req.flash("success", "Transacción guardada");
                    if(cheque){
                        Check.findOne({_id:cheque},function(err,checkFound){
                            if(err){
                                req.flash("error", err);
                            } else {
                                
                                var dateCheck = checkFound.date ? checkFound.date : fecha;
                                var nameCheck = checkFound.name ? checkFound.name : req.body.transaction.name;
                                var conceptCheck = checkFound.concept ? checkFound.concept : req.body.transaction.obs;
                                var totalCheck = checkFound.total ? checkFound.total : req.body.transaction.total *100;
                                var fechaFinal= req.body.transaction.finalDate ? req.body.transaction.finalDate : "";
                                fechaFinal = fechaFinal ? dateFormat(fechaFinal, "yyyymmdd") : "";
                                
                                var objectCheck = {
                                    date : dateCheck,
                                    name : nameCheck,
                                    concept : conceptCheck,
                                    total: totalCheck,
                                    finalDate: fechaFinal
                                };
                                
                                Check.findByIdAndUpdate(checkFound._id,objectCheck,function(err,updatedCheck){
                                    if(err){
                                        req.flash("error", err);
                                    } else {
                                        req.flash("success", "Cheque editado");
                                        var factura = crearFactura(req.body.transaction,req,fecha,newTransaction);
                                        if(factura){
                                            req.flash("error", "Error al crear factura");
                                        } else {
                                            req.flash("success", "Factura creada");
                                        }
                                        if(req.body.otro){
                                            res.redirect("/transactions/new");    
                                        } else {
                                            res.redirect("/transactions/p=1/s=.");
                                        }
                                    }
                                });
                            }
                        });
                    } else {
                        var factura = crearFactura(req.body.transaction,req,fecha,newTransaction);
                        if(factura){
                            req.flash("error", "Error al crear factura");
                        } else {
                            req.flash("success", "Factura creada");
                        }
                        if(req.body.otro){
                            res.redirect("/transactions/new");    
                        } else {
                            res.redirect("/transactions/p=1/s=.");
                        }    
                    }
                }
            }); 
        }       
    });
});

//EDIT
router.get("/:id/edit", middleware.isLoggedIn, function(req,res){
    Transaction.findById(req.params.id).populate("category subcategory account check company proyect invoice").exec(function(err,foundTransaction){
        if (err) {
            req.flash("error", err);
        } else {
            if (!foundTransaction) {
                req.flash("error", "Dato no encontrado");
            }
            Category.find({sign: foundTransaction.sign}).sort({name: 1}).exec(function(err, categories) {
                if (err){
                        req.flash("error", err);
                } else {
                    Subcategory.find({category: foundTransaction.category}).sort({name: 1}).exec(function(err, subcategories) {
                        if (err){
                                req.flash("error", err);
                        } else {
                            Account.find({}).sort({name: 1}).exec(function(err, accounts) {
                                if (err){
                                        req.flash("error", err);
                                } else {
                                    Check.find({account: foundTransaction.account}).sort({number: 1}).exec(function(err, checks) {
                                        if (err){
                                                req.flash("error", err);
                                        } else {
                                            Company.find({}).sort({name: 1}).exec(function(err, companies) {
                                                if (err){
                                                        req.flash("error", err);
                                                } else {
                                                    Proyect.find({status: "En Ejecución"}).sort({name: 1}).exec(function(err, proyects) {
                                                        if (err){
                                                                req.flash("error", err);
                                                        } else {
                                                            Contact.find({$and:[{nit:{$ne:null}},{$or:[{isProvider: true},{isWorker:true}]}]}).sort({nit: 1}).exec(function(err, contacts) {
                                                                if (err){
                                                                        req.flash("error", err);
                                                                } else {
                                                                    Invoice.findOne({_id: foundTransaction.invoice}).populate("contact").sort({nit: 1}).exec(function(err, invoice) {
                                                                        if (err){
                                                                                req.flash("error", err);
                                                                        } else {
                                                                            res.render("transactions/edit",{
                                                                                transaction: foundTransaction,
                                                                                categories: categories,
                                                                                subcategories: subcategories,
                                                                                accounts: accounts,
                                                                                checks: checks,
                                                                                companies: companies,
                                                                                proyects: proyects,
                                                                                contacts: contacts,
                                                                                invoice: invoice,
                                                                                numeral: numeral
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

//UPDATE
router.put("/:id", middleware.isLoggedIn, function(req,res){
    var fecha=dateFormat(req.body.transaction.date, "yyyymmdd");
    var cheque = req.body.transaction.check ? req.body.transaction.check : "";
    var proyecto = req.body.transaction.proyect ? req.body.transaction.proyect : "";
    var cuenta = req.body.transaction.account;
    var factura;
    Account.findOne({_id:cuenta},function(err,accountFound){
        if(err){
            req.flash("error", err);
        } else {
            var object = {
                date: fecha,
                type: "TD",
                sign: req.body.transaction.sign,
                category: req.body.transaction.category,
                subcategory: req.body.transaction.subcategory,
                account: req.body.transaction.account,
                company: req.body.transaction.company,
                total: req.body.transaction.total *100,
                obs: "Transacción de " + req.body.transaction.total + " para cuenta " + accountFound.name + " en fecha " + req.body.transaction.date + " |" + req.body.transaction.obs
            };  
            if(cheque && proyecto) { object["check"] = cheque; object["proyect"] = proyecto;}
            if(cheque && !proyecto) { object["$unset"] = {proyect:""}; object["check"] = cheque;}
            if(!cheque && proyecto) { object["$unset"] = {check:""}; object["proyect"] = proyecto;}
            if(!cheque && !proyecto) { object["$unset"] = {check:"", proyect:""};}
            Transaction.findByIdAndUpdate(req.params.id,object,function(err,updatedTransaction){
                if(err){
                    req.flash("error", err);
                } else {
                    req.flash("success", "Transacción editada");
                    
                    if(cheque){
                        Check.findOne({_id:cheque},function(err,checkFound){
                            if(err){
                                req.flash("error", err);
                            } else {
                                var fechaFinal= req.body.transaction.finalDate ? req.body.transaction.finalDate : "";
                                fechaFinal = fechaFinal ? dateFormat(fechaFinal, "yyyymmdd") : "";
                                var objectCheck = {
                                    date : fecha,
                                    name : req.body.transaction.name,
                                    concept : req.body.transaction.obs,
                                    total: req.body.transaction.total *100,
                                    finalDate: fechaFinal
                                };
                                Check.findByIdAndUpdate(checkFound._id,objectCheck,function(err,updatedCheck){
                                    if(err){
                                        req.flash("error", err);
                                    } else {
                                        req.flash("success", "Cheque editado");
                                        if(req.body.transaction.contact){
                                             factura = crearFactura(req.body.transaction,req,fecha,updatedTransaction);
                                        } else {
                                            factura = quitarFactura(req,updatedTransaction);
                                        }
                                        if(factura){
                                            req.flash("error", "Error al crear factura");
                                        } else {
                                            req.flash("success", "Factura creada");
                                        }
                                        res.redirect("/transactions/p=1/s=.");
                                    }
                                });
                            }
                        });
                    } else {
                        if(req.body.transaction.contact){
                             factura = crearFactura(req.body.transaction,req,fecha,updatedTransaction);
                        } else {
                            factura = quitarFactura(req,updatedTransaction);
                        }
                       
                        if(factura){
                            req.flash("error", "Error al crear factura");
                        } else {
                            req.flash("success", "Factura creada");
                        }
                        res.redirect("/transactions/p=1/s=.");
                    }
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
            req.flash("success", "Transacción eliminada");
            res.redirect("/transactions/p=1/s=.");
        }
    });
});

module.exports = router;