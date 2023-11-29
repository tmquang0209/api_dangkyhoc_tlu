const mongoose = require("mongoose");

const semesterSchema = new mongoose.Schema({
    year: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Year",
        require: true,
    },

    semesterId: {
        type: Number,
        require: true,
    },

    semesterName: {
        type: String,
        require: true,
    },
});

const Semester = mongoose.model("Semester", semesterSchema);
module.exports = Semester;
