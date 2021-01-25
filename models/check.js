var mongoose = require("mongoose");

var CheckSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account"
    },
    number: String,
    date: Number,
    name: String,
    concept: String,
    total: Number,
    finalDate: Number
});

module.exports = mongoose.model("Check", CheckSchema);