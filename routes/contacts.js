var express = require("express");
var router = express.Router();
var Contact = require("../models/contact");
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
            {fullName:  regexArray},
            {nit:  regexArray},
            {tags:  regexArray},
            {phone1:  regexArray},
            {phone2:  regexArray},
            {phone3:  regexArray}
    ]
   Contact
        .find({ $or: searchArray})
        .sort({name: 1})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .exec(function(err, contacts) {
            if (err){
                req.flash("error", err);
            } else{
                Contact.find({ $or: searchArray}).count().exec(function(err, count) {
                    if (err) {
                        req.flash("error", err);
                    } else {
                        res.render('contacts/index', {
                            contacts: contacts,
                            current: page,
                            searching: search,
                            catalog: "contacts",
                            title: "Contactos",
                            addButton: "Nuevo Contacto",
                            pages: Math.ceil(count / perPage)
                        });
                    }
                });
            }
        });
});

//NEW 
router.get("/new", middleware.isLoggedIn, function(req,res){
    res.render("contacts/new");
});

//CREATE 
router.post("/", middleware.isLoggedIn, function(req,res){
    Contact.create(req.body.contact, function(err,newContact){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Contacto guardado");
            if(req.body.otro){
                res.redirect("/contacts/new");    
            } else {
                res.redirect("/contacts/p=1/s=.");
            }
        }
    });   
});

// //SHOW 
// router.get("/:id",function(req,res){
//     Campground.findById(req.params.id).populate("comments").exec(function(err,foundCampground){
//       if(err) {
//           console.log(err);
//       } else {
//           if (!foundCampground) {
//                 return res.status(400).send("Item not found.");
//             }
//           res.render("campgrounds/show",{campground:foundCampground});
//       }
//     });
// });

//EDIT
router.get("/:id/edit", middleware.isLoggedIn, function(req,res){
    Contact.findById(req.params.id,function(err,foundContact){
        if (err) {
            req.flash("error", err);
        } else {
            if (!foundContact) {
                req.flash("error", "Dato no encontrado");
            }
            res.render("contacts/edit",{contact:foundContact});
        }
    });
});

//UPDATE
router.put("/:id", middleware.isLoggedIn, function(req,res){
    Contact.findByIdAndUpdate(req.params.id,req.body.contact,function(err,updatedContact){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Contacto editado");
            res.redirect("/contacts/p=1/s=.");
        }
    });
});

//DESTROY
router.delete("/:id",middleware.isLoggedIn,function(req,res){
    Contact.findByIdAndRemove(req.params.id,function(err){
        if(err){
            req.flash("error", err);
        } else {
            req.flash("success", "Contacto eliminado");
            res.redirect("/contacts/p=1/s=.");
        }
    });
});

router.post("/list/invoice", middleware.isLoggedIn, function(req, res) {
   Contact.find({$and:[{nit:{$ne:null}},{$or:[{isProvider: true},{isWorker:true}]}]}).sort({nit: 1}).exec(function(err, contacts) {
        if (err){
                req.flash("error", err);
        } else {
            var opciones = "<option value=''>SIN FACTURA</option>";
            contacts.forEach(function(contact){
                opciones += "<option value='" + contact._id + "'>" + contact.nit + " (" + contact.name + ")</option>"
            });
            res.send(opciones);
        }
    }); 
});

module.exports = router;