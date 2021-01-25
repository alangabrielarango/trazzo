var mongoose = require("mongoose");

var CategorySchema = new mongoose.Schema({
    name: String,
    sign: Number
});

module.exports = mongoose.model("Category", CategorySchema);

