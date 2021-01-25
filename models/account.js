var mongoose = require("mongoose");

var AccountSchema = new mongoose.Schema({
    name: String,
    type: String,
    bank: String,
    number: String,
    contact: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contact"
    }
});

module.exports = mongoose.model("Account", AccountSchema);

