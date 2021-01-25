var express = require("express");
var dateFormat = require('dateformat');
var router = express.Router();
var Invoice = require("../models/invoice");
var Transaction = require("../models/transaction");
var Contact = require("../models/contact");
var middleware = require("../middleware");
var numeral = require('numeral');
// var async = require('async');

// var funciones = {};

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
            {serial:  regexArray},
            {number:  regexArray}
    ];
    
    Invoice  
        .find({ $or: searchArray})
        .populate("contact")
        .sort({date: -1})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .exec(function(err, invoices) {
            if (err){
                req.flash("error", err.toString());
                res.redirect("/invoices/p=1/s=.");
            } else{
                Invoice.find({ $or: searchArray}).count().exec(function(err, count) {
                    if (err) {
                        req.flash("error", err.toString());
                        res.redirect("/invoices/p=1/s=.");
                    } else {
                        res.render('invoices/index', {
                            invoices: invoices,
                            current: page,
                            searching: search,
                            catalog: "invoices",
                            title: "Factura",
                            addButton: "Nueva Factura",
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
    Contact.find({$or:[{isProvider:true}]}).sort({nit: 1}).exec(function(err, contacts) {
        if (err){
                req.flash("error", err.toString());
                res.redirect("/invoices/p=1/s=.");
        } else {
            res.render("invoices/new",{
                contacts: contacts
            });
        }
    });
});

//CREATE 
router.post("/", middleware.isLoggedIn, function(req,res){
    var fecha=dateFormat(req.body.invoice.date, "yyyymmdd");
    var include = req.body.invoice.include ? true : false;
    var object = {
        date: fecha,
        contact: req.body.invoice.contact,
        serial: req.body.invoice.serial,
        number: req.body.invoice.number,
        total: req.body.invoice.total *100,
        include: include
    };
    Invoice.create(object, function(err,newInvoice){
        if(err){
            req.flash("error", err.toString());
            res.redirect("/invoices/p=1/s=.");
        } else {
            req.flash("success", "Factura guardada");
            if(req.body.otro){
                res.redirect("/invoices/new");    
            } else {
                res.redirect("/invoices/p=1/s=.");
            }
        }
    });   
});

//EDIT
router.get("/:id/edit", middleware.isLoggedIn, function(req,res){
    Invoice.findById(req.params.id).populate("contact").exec(function(err,foundInvoice){
        if (err) {
            req.flash("error", err.toString());
            res.redirect("/invoices/p=1/s=.");
        } else {
            if (!foundInvoice) {
                req.flash("error", "Dato no encontrado");
                res.redirect("/invoices/p=1/s=.");
            }
            Contact.find({isProvider : true}).sort({nit: 1}).exec(function(err, contacts) {
                if (err){
                    req.flash("error", err.toString());
                    res.redirect("/invoices/p=1/s=.");
                } else {
                    //console.log(foundInvoice);
                    res.render("invoices/edit",{
                        invoice:foundInvoice,
                        contacts: contacts,
                        numeral: numeral
                    });
                }
            });
        }
    });
});

//UPDATE
router.put("/:id", middleware.isLoggedIn, function(req,res){
    var fecha=dateFormat(req.body.invoice.date, "yyyymmdd");
    var include = req.body.invoice.include ? true : false;
    var object = {
        date: fecha,
        contact: req.body.invoice.contact,
        serial: req.body.invoice.serial,
        number: req.body.invoice.number,
        total: req.body.invoice.total *100,
        include: include
    };
    //console.log(object);
    //console.log(include);
    Invoice.findByIdAndUpdate(req.params.id,object,function(err,updatedInvoice){
        if(err){
            req.flash("error", err);
            res.redirect("/invoices/p=1/s=.");
        } else {
            req.flash("success", "Factura editada");
            res.redirect("/invoices/p=1/s=.");
        }
    });
});

//DESTROY
router.delete("/:id",middleware.isLoggedIn,function(req,res){
    Transaction.find({invoice: req.params.id}).count().exec(function(err, count) {
        if(err){
            req.flash("error", err);
        } else {
            if(count){
                req.flash("error", "No se puede eliminar esta factura ya que está asignada a una transacción. Quite la factura de la transacción primero.");    
                res.redirect("/invoices/p=1/s=.");
            } else {
                Invoice.findByIdAndRemove(req.params.id,function(err){
                    if(err){
                        req.flash("error", err);
                    } else {
                        req.flash("success", "Factura eliminada");
                        res.redirect("/invoices/p=1/s=.");
                    }
                }); 
            }
        }
    });
});

module.exports = router;