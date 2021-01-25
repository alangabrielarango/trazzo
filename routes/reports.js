var express = require("express");
// var dateFormat = require('dateformat');
var router = express.Router();
var Transaction = require("../models/transaction");
var Company = require("../models/company");
var Proyect = require("../models/proyect");
var Account = require("../models/account");
// var Category = require("../models/category");
// var Subcategory = require("../models/subcategory");
// var Check = require("../models/check");
// var Contact = require("../models/contact");
 var Invoice = require("../models/invoice");
var middleware = require("../middleware");
var numeral = require('numeral');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;


router.get('/accounts/:account/:year/:month', middleware.isLoggedIn, function(req,res){
    var inicio = req.params.year + numeral(req.params.month).format('00') + "01";
    var fin = req.params.year + numeral(req.params.month).format('00') + "31";

    var searchArray = {
        $and: [
            {date: {$gte:inicio}},
            {date: {$lte:fin}}
        ]
    };
    if(req.params.account !== "ALL") {searchArray["$and"].push({account : req.params.account});}
    Transaction
        .find(searchArray)
        .populate("category subcategory account company check proyect")
        .populate({path: "invoice", populate: {path: "contact"}})
        .sort({date: 1})
        .exec(function(err, transactions) {
            if (err){
                req.flash("error", err);
                res.redirect("/reports/accounts/ALL/2019/01");
            } else {
                Account.find().sort({name: 1}).exec(function(err,accounts){
                    if (err){
                        req.flash("error", err);
                        res.redirect("/reports/accounts/ALL/2019/01");
                    } else {
                        
                        var searchArray2 = [
                            { $match: {$and: [{date: {$lt: Number(inicio)}}]}},
                            { $group: { _id: null, acum: { $sum: { $multiply: [ "$sign", "$total" ] } } } }
                        ];
                        if(req.params.account !== "ALL") {searchArray2[0]["$match"]["$and"].push({account : ObjectId(req.params.account)});}
                        
                        Transaction.aggregate(searchArray2,function(err,suma){
                            if (err){
                                req.flash("error", err);
                                res.redirect("/reports/accounts/ALL/2019/01");
                            } else {
                                
                                res.render('reports/accounts', {
                                    transactions: transactions,
                                    numeral: numeral,
                                    accounts: accounts,
                                    yearS: req.params.year,
                                    monthS: req.params.month,
                                    accountS: req.params.account,
                                    suma: suma
                                });     
                            }
                        });
                    }
                });
            }
        });
});

router.get('/categories/:company/:year', middleware.isLoggedIn, function(req,res){
    
    var inicio = req.params.year + "0101";
    var fin = req.params.year + "1231";

    var searchArray2 = [
        { 
            $match: {
                $and: [
                    {date: {$gte: Number(inicio)}},
                    {date: {$lte: Number(fin)}}                                        
                ]
            }
        },
        { $lookup:
            {
                from: "categories",
                localField: "category",
                foreignField: "_id",
                as: "cat"
            }
        },
        { $lookup:
            {
                from: "subcategories",
                localField: "subcategory",
                foreignField: "_id",
                as: "subcat"
            }
        },
        { $unwind: "$cat"},
        { $unwind: "$subcat"},
        { $group: 
            {
                _id : { 
                    category: "$cat.name" , 
                    subcategory: "$subcat.name", 
                    month: {$divide: [{$subtract: [{$mod: ["$date",10000]},{$mod: ["$date",100]}]},100]} 
                },
                acum: { $sum: { $multiply: [ "$sign", "$total" ] } } 
            } 
        },
        { $project: 
            {
                _id:0,          
                mes: "$_id.month",
                categoria: "$_id.category",
                subcategoria: "$_id.subcategory",
                total: "$acum"
            }
        },
        { $sort: {categoria:1,subcategoria:1, mes:1}}
    ];

    if(req.params.company !== "ALL") {
        searchArray2[0]["$match"]["$and"].push({company : ObjectId(req.params.company)});
    } 
            
    Transaction.aggregate(searchArray2,function(err,transactions)
    {
        if (err){
            req.flash("error", err);
            res.redirect("/reports/categories/ALL/" + req.params.year);
        } else {            
            Company.find().sort({name: 1}).exec(function(err,companies){
                if (err){
                    req.flash("error", err);
                    res.redirect("/reports/categories/ALL/" + req.params.year);
                } else {   

                    //console.log(transactions);
            
                    res.render('reports/categories', {
                        transactions: transactions,
                        numeral: numeral,
                        companies: companies,
                        companyS: req.params.company,
                        yearS: req.params.year
                    });
                }
            });
        }
    });     
});

router.get('/proyects/:proyect/:year', middleware.isLoggedIn, function(req,res){

    var searchArray;
    var inicio = req.params.year + "0101";
    var fin = req.params.year + "1231";
    if(req.params.proyect !== "ALL") {searchArray = 
        {$and: [
            {date: {$gte:inicio}},
            {date: {$lte:fin}},
            {proyect : req.params.proyect}
        ]}
    }
    
    Transaction
        .find(searchArray)
        .populate("category subcategory account company check proyect")
        .populate({path: "invoice", populate: {path: "contact"}})
        .sort({date: 1})
        .exec(function(err, transactions) {
            if (err){
                req.flash("error", err);
                res.redirect("/reports/proyects/ALL");
            } else {
                Proyect.find().populate("company").sort({name: 1}).exec(function(err,proyects){
                    if (err){
                        req.flash("error", err);
                        res.redirect("/reports/proyects/ALL/" + req.params.year);
                    } else {
                        
                        var searchArray2 = [
                            { $match: {$and: [{date: {$lt: Number(inicio)}}]}},
                            { $group: { _id: null, acum: { $sum: { $multiply: [ "$sign", "$total" ] } } } }
                        ];
                        if(req.params.proyect !== "ALL") {searchArray2[0]["$match"]["$and"].push({proyect : ObjectId(req.params.proyect)});} 
                                               
                        Transaction.aggregate(searchArray2,function(err,suma){
                            if (err){
                                req.flash("error", err);
                                res.redirect("/reports/proyects/ALL/" + req.params.year);
                            } else {
                                
                                res.render('reports/proyects', {
                                    transactions: transactions,
                                    numeral: numeral,
                                    proyects: proyects,
                                    proyectS: req.params.proyect,
                                    suma: suma,
                                    yearS: req.params.year
                                });     
                            }
                        });
                    }
                });
            }
        });
});

router.get('/invoices/:year/:month', middleware.isLoggedIn, function(req,res){
    var inicio = req.params.year + numeral(req.params.month).format('00') + "01";
    var fin = req.params.year + numeral(req.params.month).format('00') + "31";
    
    var searchArray = {
        $and: [
            {date: {$gte:inicio}},
            {date: {$lte:fin}},
            {include: true}
        ]
    };
    //if(req.params.account !== "ALL") {searchArray["$and"].push({account : req.params.account});}
    Invoice
        .find(searchArray)
        .populate("contact")
        //.populate({path: "invoice", populate: {path: "contact"}})
        .sort({date: 1})
        .exec(function(err, invoices) {
            if (err){
                req.flash("error", err);
                res.redirect("/reports/invoices/2019/02");
            } else {
                /*Account.find().sort({name: 1}).exec(function(err,accounts){
                    if (err){
                        req.flash("error", err);
                        res.redirect("/reports/accounts/ALL/2019/01");
                    } else {
                        
                        var searchArray2 = [
                            { $match: {$and: [{date: {$lt: Number(inicio)}}]}},
                            { $group: { _id: null, acum: { $sum: { $multiply: [ "$sign", "$total" ] } } } }
                        ];
                        if(req.params.account !== "ALL") {searchArray2[0]["$match"]["$and"].push({account : ObjectId(req.params.account)});}
                        
                        Transaction.aggregate(searchArray2,function(err,suma){
                            if (err){
                                req.flash("error", err);
                                res.redirect("/reports/accounts/ALL/2019/01");
                            } else {*/
                                
                                res.render('reports/invoices', {
                                    invoices: invoices,
                                    numeral: numeral,
                                    //accounts: accounts,
                                    yearS: req.params.year,
                                    monthS: req.params.month,
                                    //accountS: req.params.account,
                                    //suma: suma
                                });     
                            }
                        });
                    //}
                //});
            //}
        //});    
});

module.exports = router;