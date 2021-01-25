var mongoose = require("mongoose");

var InvoiceSchema = new mongoose.Schema({
    date: Number,
    contact: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contact"
    },
    serial: String,
    number: String,
    total: Number,
    include: Boolean
});

module.exports = mongoose.model("Invoice", InvoiceSchema);