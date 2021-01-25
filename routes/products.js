var express = require("express");
var dateFormat = require('dateformat');
var router = express.Router();
var Contact = require("../models/contact");
var Product = require("../models/product");
// var Transaction = require("../models/transaction");
// var Contact = require("../models/contact");
var middleware = require("../middleware");
var numeral = require('numeral');
// // var async = require('async');

// // var funciones = {};

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
            {name:  regexArray}
    ];
    
    Product  
        .find({ $or: searchArray})
        .populate("contact")
        .sort({name: -1})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .exec(function(err, products) {
            if (err){
                req.flash("error", err.toString());
                res.redirect("/products/p=1/s=.");
            } else{
                Product.find({ $or: searchArray}).count().exec(function(err, count) {
                    if (err) {
                        req.flash("error", err.toString());
                        res.redirect("/products/p=1/s=.");
                    } else {
                        res.render('products/index', {
                            products: products,
                            current: page,
                            searching: search,
                            catalog: "products",
                            title: "Producto",
                            addButton: "Nuevo Producto",
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
    Contact.find({$and:[{nit:{$ne:null}},{$or:[{isProvider: true},{isWorker:true}]}]}).sort({nit: 1}).exec(function(err, contacts) {
        if (err){
                req.flash("error", err.toString());
                res.redirect("/products/p=1/s=.");
        } else {
            res.render("products/new",{
                contacts: contacts
            });
        }
    });
});

//CREATE 
router.post("/", middleware.isLoggedIn, function(req,res){
    var fecha=dateFormat(req.body.product.date, "yyyymmdd");
   
    var object = {
        date: fecha,
        contact: req.body.product.contact,
        name: req.body.product.name,
        price: req.body.product.price *100
    };
    Product.create(object, function(err,newProduct){
        if(err){
            req.flash("error", err.toString());
            res.redirect("/products/p=1/s=.");
        } else {
            req.flash("success", "Producto guardado");
            if(req.body.otro){
                res.redirect("/products/new");    
            } else {
                res.redirect("/products/p=1/s=.");
            }
        }
    });   
});

//EDIT
router.get("/:id/edit", middleware.isLoggedIn, function(req,res){
    Product.findById(req.params.id).populate("contact").exec(function(err,foundProduct){
        if (err) {
            req.flash("error", err.toString());
            res.redirect("/products/p=1/s=.");
        } else {
            if (!foundProduct) {
                req.flash("error", "Dato no encontrado");
                res.redirect("/products/p=1/s=.");
            }
            Contact.find({$and:[{nit:{$ne:null}},{$or:[{isProvider: true},{isWorker:true}]}]}).sort({nit: 1}).exec(function(err, contacts) {
                if (err){
                    req.flash("error", err.toString());
                    res.redirect("/invoices/p=1/s=.");
                } else {
                    res.render("products/edit",{
                        product:foundProduct,
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
    var fecha=dateFormat(req.body.product.date, "yyyymmdd");
    var object = {
        date: fecha,
        contact: req.body.product.contact,
        name: req.body.product.name,
        price: req.body.product.price *100
    };
    Product.findByIdAndUpdate(req.params.id,object,function(err,updatedProduct){
        if(err){
            req.flash("error", err);
            res.redirect("/products/p=1/s=.");
        } else {
            req.flash("success", "Producto editado");
            res.redirect("/products/p=1/s=.");
        }
    });
});

//DESTROY
router.delete("/:id",middleware.isLoggedIn,function(req,res){
    Product.findByIdAndRemove(req.params.id,function(err){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Producto eliminado");
            res.redirect("/products/p=1/s=.");
        }
    }); 
});

module.exports = router;