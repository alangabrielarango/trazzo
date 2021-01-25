var mongoose = require("mongoose");

var ProductsSchema = new mongoose.Schema({
    name: String,
    contact: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contact"
    },
    date: Number,
    price: Number
});

module.exports = mongoose.model("Product", ProductsSchema);

