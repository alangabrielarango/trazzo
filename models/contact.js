var mongoose = require("mongoose");

var ContactSchema = new mongoose.Schema({
    name: String,
    nit: String,
    fullName: String,
    phone1: String,
    phone2: String,
    phone3: String,
    email: String,
    webPage: String,
    tags: String,
    hasAccount: Boolean,
    isClient: Boolean,
    isProvider: Boolean,
    isWorker: Boolean
});

module.exports = mongoose.model("Contact", ContactSchema);

