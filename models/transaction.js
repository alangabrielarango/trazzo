var mongoose = require("mongoose");

var TransactionSchema = new mongoose.Schema({
    date: Number,
    type: String,
    sign: Number,
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
    },
    subcategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subcategory"
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account"
    },
    check: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Check"
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company"
    },
    proyect: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Proyect"
    },
    invoice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Invoice"
    },
    total: Number,
    obs: String
});

module.exports = mongoose.model("Transaction", TransactionSchema);

