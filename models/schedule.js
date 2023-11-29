const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({
    semester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Semester",
        require: true,
    },

    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        require: true,
    },

    className: {
        type: String,
        require: true,
    },

    day: {
        type: Number,
        require: true,
    },

    shift: {
        type: String,
        require: true,
    },

    classroom: {
        type: String,
        require: true,
    },

    teacher: {
        type: String,
        require: true,
    },
});

const Schedule = mongoose.model("Schedule", scheduleSchema);

module.exports = Schedule;
