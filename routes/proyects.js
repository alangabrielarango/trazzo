var express = require("express");
var router = express.Router();
var Proyect = require("../models/proyect");
var Contact = require("../models/contact");
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
    var perPage = 10;
    var page = req.params.page || 1;
    var regexArray = {"$regex": ".*" + search + ".*" , "$options": 'i'};
    var searchArray = [
            {name:  regexArray},
            {status: regexArray}
    ]
   Proyect
        .find({ $or: searchArray})
        .populate("company contact")
        .sort({name: 1})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .exec(function(err, proyects) {
            if (err){
                req.flash("error", err);
            } else{
                Proyect.find({ $or: searchArray}).count().exec(function(err, count) {
                    if (err) {
                        req.flash("error", err);
                    } else {
                        res.render('proyects/index', {
                            proyects: proyects,
                            current: page,
                            searching: search,
                            catalog: "proyects",
                            title: "Proyectos",
                            addButton: "Nuevo Proyecto",
                            pages: Math.ceil(count / perPage)
                        });
                    }
                });
            }
        });
});

//NEW 
router.get("/new", middleware.isLoggedIn, function(req,res){
    Contact.find({isClient : true}).sort({name: 1}).exec(function(err, contacts) {
        if (err){
                req.flash("error", err);
        } else {
            Company.find().sort({name: 1}).exec(function(err, companies) {
                if (err){
                        req.flash("error", err);
                } else {
                    res.render("proyects/new",{
                        contacts: contacts,
                        companies: companies
                    });
                }
            });
        }
    });
});

//CREATE 
router.post("/", middleware.isLoggedIn, function(req,res){
    Proyect.create(req.body.proyect, function(err,newProyect){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Proyecto guardado");
            if(req.body.otro){
                res.redirect("/proyects/new");    
            } else {
                res.redirect("/proyects/p=1/s=.");
            }
        }
    });   
});

//EDIT
router.get("/:id/edit", middleware.isLoggedIn, function(req,res){
    Proyect.findById(req.params.id).populate("company contact").exec(function(err,foundProyect){
        if (err) {
            req.flash("error", err);
        } else {
            if (!foundProyect) {
                req.flash("error", "Dato no encontrado");
            }
            Contact.find({isClient : true}).sort({name: 1}).exec(function(err, contacts) {
                if (err){
                        req.flash("error", err);
                } else {
                    Company.find().sort({name: 1}).exec(function(err, companies) {
                    if (err){
                                req.flash("error", err);
                        } else {
                            res.render("proyects/edit",{
                                proyect:foundProyect,
                                contacts: contacts,
                                companies: companies
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
    Proyect.findByIdAndUpdate(req.params.id,req.body.proyect,function(err,updatedProyect){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Proyecto editado");
            res.redirect("/proyects/p=1/s=.");
        }
    });
});

//DESTROY
router.delete("/:id",middleware.isLoggedIn,function(req,res){
    Proyect.findByIdAndRemove(req.params.id,function(err){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Proyecto eliminado");
            res.redirect("/proyects/p=1/s=.");
        }
    });
});

router.post("/list", middleware.isLoggedIn, function(req, res) {
   Proyect.find({$and:[{status: "En Ejecución"},{company: req.body.seleccion}]}).sort({name: 1}).exec(function(err, proyects) {
        if (err){
                req.flash("error", err);
        } else {
            var opciones = "<option value=''>SIN PROYECTO</option>";
            proyects.forEach(function(proyect){
                opciones += "<option value='" + proyect._id + "'>" + proyect.name + "</option>";
            });
            res.send(opciones);
        }
    }); 
});

module.exports = router;