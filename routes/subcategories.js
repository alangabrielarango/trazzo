var express = require("express");
var router = express.Router();
var Subcategory = require("../models/subcategory");
var Category = require("../models/category");
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
            {name:  regexArray}
    ]
   Subcategory
        .find({ $or: searchArray})
        .populate("category")
        .sort({name: 1})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .exec(function(err, subcategories) {
            if (err){
                req.flash("error", err);
            } else{
                Subcategory.find({ $or: searchArray}).count().exec(function(err, count) {
                    if (err) {
                        req.flash("error", err);
                    } else {
                        res.render('subcategories/index', {
                            subcategories: subcategories,
                            current: page,
                            searching: search,
                            catalog: "subcategories",
                            title: "Subcategorías",
                            addButton: "Nueva Subcategoría",
                            pages: Math.ceil(count / perPage)
                        });
                    }
                });
            }
        });
});

//NEW 
router.get("/new", middleware.isLoggedIn, function(req,res){
    Category.find({sign : -1}).sort({name: 1}).exec(function(err, categories) {
        if (err){
                req.flash("error", err);
        } else {
            res.render("subcategories/new",{
                categories: categories
            });
        }
    })
});

//CREATE 
router.post("/", middleware.isLoggedIn, function(req,res){
    Subcategory.create(req.body.subcategory, function(err,newSubcategory){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Subcategoría guardada");
            if(req.body.otro){
                res.redirect("/subcategories/new");    
            } else {
                res.redirect("/subcategories/p=1/s=.");
            }
        }
    });   
});

//EDIT
router.get("/:id/edit", middleware.isLoggedIn, function(req,res){
    Subcategory.findById(req.params.id).populate("category").exec(function(err,foundSubcategory){
        if (err) {
            req.flash("error", err);
        } else {
            if (!foundSubcategory) {
                req.flash("error", "Dato no encontrado");
            }
            Category.find({sign : foundSubcategory.sign}).sort({name: 1}).exec(function(err, categories) {
                if (err){
                        req.flash("error", err);
                } else {
                    res.render("subcategories/edit",{
                        subcategory:foundSubcategory,
                        categories: categories
                    });
                }
            });
        }
    });
});

//UPDATE
router.put("/:id", middleware.isLoggedIn, function(req,res){
    Subcategory.findByIdAndUpdate(req.params.id,req.body.subcategory,function(err,updatedSubcategory){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Subcategoría editada");
            res.redirect("/subcategories/p=1/s=.");
        }
    });
});

//DESTROY
router.delete("/:id",middleware.isLoggedIn,function(req,res){
    Subcategory.findByIdAndRemove(req.params.id,function(err){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Subcategoría eliminada");
            res.redirect("/subcategories/p=1/s=.");
        }
    });
});

router.post("/list", middleware.isLoggedIn, function(req, res) {
   Subcategory.find({category : req.body.seleccion}).sort({name: 1}).exec(function(err, subcategories) {
        if (err){
                req.flash("error", err);
        } else {
            var opciones = "";
            subcategories.forEach(function(subcategory){
                opciones += "<option value='" + subcategory._id + "'>" + subcategory.name + "</option>"
            });
            res.send(opciones);
        }
    }); 
});

module.exports = router;