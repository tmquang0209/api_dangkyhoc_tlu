const mongoose = require("mongoose");

const yearSchema = new mongoose.Schema({
    yearId: {
        type: Number,
        require: true,
    },

    yearName: {
        type: String,
        require: true,
    },
});

const Year = mongoose.model("Year", yearSchema);
module.exports = Year;
