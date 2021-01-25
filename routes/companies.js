var express = require("express");
var router = express.Router();
var Company = require("../models/company");
var middleware = require("../middleware");

//INDEX REDIRECT WITH SEARCH
router.post('/p=:page', middleware.isLoggedIn, function(req,res){
    var search = req.body.searchText || ".";
   res.redirect('p='+req.params.page+'/s='+search) ;
});

//INDEX WITH PAGINATION AND SEARCH
router.get('/p=:page/s=:searchText', middleware.isLoggedIn, function(req, res) {
    
    var search = req.params.searchText || ".";
    var perPage = 5;
    var page = req.params.page || 1;
    var regexArray = {"$regex": ".*" + search + ".*" , "$options": 'i'};
    var searchArray = [
            {name:  regexArray},
            {nit:  regexArray},
            {fullName:  regexArray}
    ]
   Company
        .find({ $or: searchArray})
        .sort({name: 1})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .exec(function(err, companies) {
            if (err){
                req.flash("error", err);
            } else{
                Company.find({ $or: searchArray}).count().exec(function(err, count) {
                    if (err) {
                        req.flash("error", err);
                    } else {
                        res.render('companies/index', {
                            companies: companies,
                            current: page,
                            searching: search,
                            catalog: "companies",
                            title: "Empresas",
                            addButton: "Nueva Empresa",
                            pages: Math.ceil(count / perPage)
                        });
                    }
                });
            }
        });
});

//NEW 
router.get("/new", middleware.isLoggedIn, function(req,res){
    res.render("companies/new");
});

//CREATE 
router.post("/", middleware.isLoggedIn, function(req,res){
    Company.create(req.body.company, function(err,newCompany){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Empresa guardada");
            if(req.body.otro){
                res.redirect("/companies/new");    
            } else {
                res.redirect("/companies/p=1/s=.");
            }
        }
    });   
});

//EDIT
router.get("/:id/edit", middleware.isLoggedIn, function(req,res){
    Company.findById(req.params.id,function(err,foundCompany){
        if (err) {
            req.flash("error", err);
        } else {
            if (!foundCompany) {
                req.flash("error", "Dato no encontrado");
            }
            res.render("companies/edit",{company:foundCompany});
        }
    });
});

//UPDATE
router.put("/:id", middleware.isLoggedIn, function(req,res){
    Company.findByIdAndUpdate(req.params.id,req.body.company,function(err,updatedCompany){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Empresa editada");
            res.redirect("/companies/p=1/s=.");
        }
    });
});

//DESTROY
router.delete("/:id",middleware.isLoggedIn,function(req,res){
    Company.findByIdAndRemove(req.params.id,function(err){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Empresa eliminada");
            res.redirect("/companies/p=1/s=.");
        }
    });
});

module.exports = router;