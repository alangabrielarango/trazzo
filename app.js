const { MongoClient } = require("mongodb");

var
    express             = require("express"),
    app                 = express(),
    bodyParser          = require("body-parser"),
    //mongodb             = require("mongodb").MongoClient,
    mongoose            = require("mongoose"),
    flash               = require("connect-flash"),
    passport            = require("passport"),
    LocalStrategy       = require("passport-local"),
    methodOverride      = require("method-override"),
    User                = require("./models/user"),
    indexRoutes         = require("./routes/index"),
    contactRoutes       = require("./routes/contacts"),
    companyRoutes       = require("./routes/companies"),
    categoryRoutes      = require("./routes/categories"),
    subcategoryRoutes   = require("./routes/subcategories"),
    accountRoutes       = require("./routes/accounts"),
    originRoutes        = require("./routes/origins"),
    checkRoutes         = require("./routes/checks"),
    transactionRoutes   = require("./routes/transactions"),
    electronicRoutes    = require("./routes/electronics"),
    atmRoutes           = require("./routes/atms"),
    proyectRoutes       = require("./routes/proyects"),
    invoiceRoutes       = require("./routes/invoices"),
    reportRoutes        = require("./routes/reports"),
    productRoutes        = require("./routes/products");


//INITIAL CONFIGURATION
mongoose.Promise = global.Promise;
var url = process.env.DATABASEURL;
//mongoose.connect(url, {useMongoClient: true});  
//mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true});   

mongoCFG = {
    useNewUrlParser: true,
    ssl: true,
    replicaSet: 'trazzo-shard-0',
    authSource: 'admin',
    retryWrites: true,
    useUnifiedTopology: true,
  }

console.log('Attempting to connect to mongoose');
mongoose.connect(url, mongoCFG)
  .then(() => {
    console.log("Connected to Mongo database!");
  })
  .catch(err => {
    console.error("No connection to DB ", err.stack);
  });


/*MongoClient.connect(url,function(err,db){
    console.log(err);
    db.close();
})*/
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine","ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());


//PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "Jen vi kaj mi: akvo kaj oleo",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//ERROR HANDLING
app.use(function(req,res,next){
    res.locals.currentUser= req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

//ROUTES
app.use(indexRoutes);
app.use("/contacts", contactRoutes);
app.use("/companies", companyRoutes);
app.use("/categories", categoryRoutes);
app.use("/subcategories", subcategoryRoutes);
app.use("/accounts", accountRoutes);
app.use("/origins", originRoutes);
app.use("/checks", checkRoutes);
app.use("/transactions", transactionRoutes);
app.use("/electronics", electronicRoutes);
app.use("/atms", atmRoutes);
app.use("/proyects", proyectRoutes);
app.use("/reports", reportRoutes);
app.use("/invoices", invoiceRoutes);
app.use("/products", productRoutes);

//INITIALIZE
//var ip = process.env.IP || "127.0.0.1";
// port = process.env.PORT || 3000;
//app.listen(3000, "127.0.0.1", function(){
app.listen(process.env.PORT, process.env.IP, function(){
    console.log("Servidor Trazzo Iniciado");
});