const mongoose = require("mongoose");

const enrollSchema = new mongoose.Schema({
    semester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Semester",
        require: true,
    },

    studentCode: {
        type: String,
        require: true,
    },

    password: {
        type: String,
        require: false,
    },

    schedule: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Schedule",
            require: true,
        },
    ],
});

const Enroll = mongoose.model("Enroll", enrollSchema);
module.exports = Enroll;
