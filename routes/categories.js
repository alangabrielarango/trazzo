var express = require("express");
var router = express.Router();
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
   Category
        .find({ $or: searchArray})
        .sort({name: 1})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .exec(function(err, categories) {
            if (err){
                req.flash("error", err);
            } else{
                Category.find({ $or: searchArray}).count().exec(function(err, count) {
                    if (err) {
                        req.flash("error", err);
                    } else {
                        res.render('categories/index', {
                            categories: categories,
                            current: page,
                            searching: search,
                            catalog: "categories",
                            title: "Categorías",
                            addButton: "Nueva Categoría",
                            pages: Math.ceil(count / perPage)
                        });
                    }
                });
            }
        });
});

//NEW 
router.get("/new", middleware.isLoggedIn, function(req,res){
    res.render("categories/new");
});

//CREATE 
router.post("/", middleware.isLoggedIn, function(req,res){
    Category.create(req.body.category, function(err,newCategory){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Categoría guardada");
            if(req.body.otro){
                res.redirect("/categories/new");    
            } else {
                res.redirect("/categories/p=1/s=.");
            }
        }
    });   
});

//EDIT
router.get("/:id/edit", middleware.isLoggedIn, function(req,res){
    Category.findById(req.params.id,function(err,foundCategory){
        if (err) {
            req.flash("error", err);
        } else {
            if (!foundCategory) {
                req.flash("error", "Dato no encontrado");
            }
            res.render("categories/edit",{category:foundCategory});
        }
    });
});

//UPDATE
router.put("/:id", middleware.isLoggedIn, function(req,res){
    Category.findByIdAndUpdate(req.params.id,req.body.category,function(err,updatedCategory){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Categoría editada");
            res.redirect("/categories/p=1/s=.");
        }
    });
});

//DESTROY
router.delete("/:id",middleware.isLoggedIn,function(req,res){
    Category.findByIdAndRemove(req.params.id,function(err){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Categoría eliminada");
            res.redirect("/categories/p=1/s=.");
        }
    });
});

router.post("/list", middleware.isLoggedIn, function(req, res) {
   Category.find({sign : req.body.seleccion}).sort({name: 1}).exec(function(err, categories) {
        if (err){
                req.flash("error", err);
        } else {
            var opciones = "";
            categories.forEach(function(category){
                opciones += "<option value='" + category._id + "'>" + category.name + "</option>"
            });
            res.send(opciones);
        }
    }); 
});

module.exports = router;