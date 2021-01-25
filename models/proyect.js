var mongoose = require("mongoose");

var ProyectSchema = new mongoose.Schema({
    name: String,
    status: String,
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company"
    },
    contact: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contact"
    }
});

module.exports = mongoose.model("Proyect", ProyectSchema);

