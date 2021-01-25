var mongoose = require("mongoose");

var SubcategorySchema = new mongoose.Schema({
    name: String,
    sign: Number,
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
    }
});

module.exports = mongoose.model("Subcategory", SubcategorySchema);

