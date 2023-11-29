const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
    subjectCode: {
        type: String,
        require: true,
    },

    subjectName: {
        type: String,
        require: true,
    },

    credits: {
        type: Number,
        default: 1,
    },

    coef: {
        type: Number,
        default: 1,
    },
});

const Subject = mongoose.model("Subject", subjectSchema);
module.exports = Subject;
