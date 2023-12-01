const app = require("express")();
const mongoose = require("mongoose");
require("dotenv").config();
const { Login } = require("./login");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

//import model
const Year = require("./models/year");
const Semester = require("./models/semester");
const Subject = require("./models/subject");
const Schedule = require("./models/schedule");
const Enroll = require("./models/enroll");
const { json } = require("express");
const mergeClass = require("./components/mergeClass");

const whitelist = [
    "https://dangkyhoc-drab.vercel.app",
    "https://dkh.toluu.site",
];

const corsOptions = {
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    }, // Replace with the actual origin of your frontend application
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true, // Allow credentials (cookies, HTTP authentication) to be sent with requests
    optionsSuccessStatus: 204, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
app.use(json());

mongoose
    .connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("Connect success to Mongodb"))
    .catch((err) => console.error(err));

const generateSecretKey = () => {
    const secretKey = crypto.randomBytes(32).toString("hex");
    return secretKey;
};

const secretKey = generateSecretKey();

app.get("/tlu/getYear", async (req, res) => {
    const page = await Login();
    await page.goto(
        "https://dangkyhoc.thanglong.edu.vn/ToanTruong/TKBToanTruong.aspx"
    );

    //get element
    const listYear = await page.evaluate(async () => {
        const option = document.querySelectorAll("#ctl00_c_droNam > option");
        const arr = [];
        option.forEach(async (item) => {
            try {
                arr.push({ value: item.value, text: item.text });
            } catch (err) {
                console.error(err);
            }
        });

        return arr;
    });

    //insert to db
    for (const item of listYear) {
        const existYear = await Year.findOne({ yearId: item.value });
        if (!existYear) {
            const newYear = new Year({
                yearId: item.value,
                yearName: item.text,
            });
            await newYear.save();
        }
    }
    res.send(listYear);
});

app.get("/tlu/getYearAndSemester", async (req, res) => {
    const page = await Login();
    await page.goto(
        "https://dangkyhoc.thanglong.edu.vn/ToanTruong/TKBToanTruong.aspx"
    );

    const list = await page.evaluate(() => {
        const option = document.querySelectorAll("#ctl00_c_droNam > option");
        const arr = [];
        option.forEach(async (item) => {
            await page.select("select#ctl00_c_droNam", item.value);
            const semesterOption = document.querySelectorAll(
                "#ctl00_c_droHocki > option"
            );
            const semesterArr = [];
            semesterOption.forEach((semesterItem) => {
                semesterArr.push({
                    semesterId: semesterItem.value,
                    semesterName: semesterItem.text,
                });
            });
            arr.push({
                yearId: item.value,
                yearName: item.text,
                semester: semesterArr,
            });
        });
    });
    res.send(list);
});

app.get("/tlu/getSemester/:year", async (req, res) => {
    try {
        const page = await Login();
        const year = req.params.year;

        // Navigate to the URL
        await page.goto(
            "https://dangkyhoc.thanglong.edu.vn/ToanTruong/TKBToanTruong.aspx"
        );

        // Select the year in the dropdown
        await page.select("select#ctl00_c_droNam", year);

        // Wait for navigation to complete
        await page.waitForNavigation();
        const listSemester = await page.evaluate(async (year) => {
            const semesterOption = document.querySelectorAll(
                "#ctl00_c_droHocki > option"
            );
            const semester = [];

            semesterOption.forEach((item) => {
                semester.push({
                    value: item.value,
                    text: item.text,
                });
            });

            return semester;
        }, year);

        for (const item of listSemester) {
            const existYear = await Year.findOne({
                yearId: req.params.year,
            });
            if (!existYear) {
                // Handle case when the year does not exist
                console.log("Year does not exist");
                continue;
            }

            const existSemester = await Semester.findOne({
                semesterId: item.value,
            });
            if (existSemester) {
                // Handle case when the semester already exists
                console.log("Semester already exists");
                continue;
            }

            const newSemester = new Semester({
                semesterId: item.value,
                semesterName: item.text,
                year: existYear._id,
            });
            newSemester.save();
        }
        res.send(listSemester);
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/tlu/getSchedule/:year/:semester", async (req, res) => {
    const { year, semester } = req.params;
    try {
        const page = await Login();
        await page.goto(
            "https://dangkyhoc.thanglong.edu.vn/ToanTruong/TKBToanTruong.aspx"
        );

        await page.select("select#ctl00_c_droNam", year);
        await page.waitForNavigation();

        await page.select("select#ctl00_c_droHocki", semester);
        await page.waitForNavigation();

        // Get the table data
        const tableData = await page.evaluate(() => {
            // Select the table element
            const table = document.querySelector(
                "#ctl00_c_gridThoiKhoaiBieuTR"
            );

            const headers = [
                "ID",
                "SubID",
                "SubName",
                "ClassName",
                "Day",
                "Shift",
                "Classroom",
                "Credits",
                "Teacher",
            ];

            // Get the table rows
            const rows = table.querySelectorAll("tr");

            // Create an array to hold the data
            const data = [];

            // Loop through the rows
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];

                // Get the cells in the row
                const cells = row.querySelectorAll("td");

                // Create an object to hold the cell values
                const rowData = {};

                // Loop through the cells
                for (let j = 0; j < cells.length; j++) {
                    // Get the cell value
                    const cellValue = cells[j].textContent.trim();

                    // Add the cell value to the object
                    rowData[headers[j]] = cellValue;
                }

                // Add the row data to the array
                data.push(rowData);
            }

            return data;
        });

        //insert to db;
        for (const item of tableData) {
            const existYear = await Year.findOne({ yearId: year });
            if (!existYear) continue;

            const existSemester = await Semester.findOne({
                semesterId: semester,
            });
            if (!existSemester) continue;

            const existSubject = await Subject.findOne({
                subjectCode: item.SubID,
            });

            let subjectInfo;
            //check subject, if don't exists => create new
            if (!existSubject) {
                const newSubject = new Subject({
                    subjectCode: item.SubID,
                    subjectName: item.SubName,
                    credits: item.Credits,
                });
                subjectInfo = await newSubject.save();
            } else {
                subjectInfo = existSubject;
            }

            //check schedule before create new
            const existsSchedule = await Schedule.findOne({
                semester: existSemester._id,
                subject: subjectInfo,
                className: item.ClassName,
                day: item.Day,
                shift: item.Shift,
            });
            //if exists => update filed
            if (existsSchedule) {
                existsSchedule.classroom = item.Classroom;
                existsSchedule.teacher = item.Teacher;
                existsSchedule.save();
            } else {
                //else => create new
                const newSchedule = new Schedule({
                    semester: existSemester._id,
                    subject: subjectInfo,
                    className: item.ClassName,
                    day: item.Day,
                    shift: item.Shift,
                    classroom: item.Classroom,
                    teacher: item.Teacher,
                });
                newSchedule.save();
            }
        }

        res.send(tableData);
    } catch (err) {
        console.error(err);
        return null;
    }
});

app.get("/api/getListYear", async (req, res) => {
    try {
        const getYear = await Year.aggregate([
            {
                $lookup: {
                    from: "semesters", // Check the actual collection name
                    localField: "_id",
                    foreignField: "year",
                    as: "semesters",
                },
            },
            {
                $project: {
                    _id: 1,
                    yearId: "$yearId",
                    yearName: "$yearName",
                    semesters: 1,
                },
            },
        ]);

        res.send({ data: getYear });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
});

app.get("/api/getSchedule/:semester", async (req, res) => {
    const { semester } = req.params;
    try {
        const getSemester = await Semester.findOne({ semesterId: semester });
        const getSchedule = await Schedule.aggregate([
            {
                $match: {
                    semester: getSemester._id,
                },
            },
            {
                $lookup: {
                    from: "subjects", // Check the actual collection name
                    localField: "subject",
                    foreignField: "_id",
                    as: "subject",
                },
            },
            {
                $unwind: "$subject", // Unwind the subject array created by $lookup
            },
            {
                $project: {
                    _id: 1,
                    subject: {
                        _id: 1,
                        subjectCode: 1,
                        subjectName: 1,
                        credits: 1,
                        coef: 1,
                    },
                    className: 1,
                    day: 1,
                    shift: 1,
                    classroom: 1,
                    teacher: 1,
                },
            },
        ]);

        res.status(200).send({ data: getSchedule });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Unknown error." });
    }
});

app.post("/api/personalSchedule", async (req, res) => {
    const { semesterId, studentCode, password } = req.body;

    const hashPassword = password ? jwt.sign({ password }, secretKey) : null;

    try {
        const getSemester = await Semester.findOne({
            semesterId: semesterId,
        });
        if (!getSemester) {
            res.status(200).json({ message: "Semester doesn't exists." });
            return;
        }
        const getEnroll = await Enroll.findOne({
            semester: getSemester._id,
            studentCode,
        });

        if (getEnroll) {
            const decodePassword = getEnroll.password
                ? jwt.decode(getEnroll.password).password
                : "";

            if (decodePassword != password) {
                res.status(200).json({
                    message: "Password is incorrect.",
                });
                return;
            }
            res.status(200).json({ data: getEnroll });
        } else {
            const newEnroll = await Enroll.create({
                semester: getSemester._id,
                studentCode: studentCode,
                password: hashPassword,
            });
            newEnroll.save();
            res.status(200).json({ data: newEnroll });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Unknown error." });
    }
});

app.post("/api/getClassRegister", async (req, res) => {
    const { enrollId, password } = req.body;

    try {
        const getEnroll = await Enroll.findById(enrollId);

        if (!getEnroll) {
            res.status(404).json({
                message: "Enrollment not found.",
            });
            return;
        }

        if (getEnroll.password !== password) {
            res.status(401).json({
                message: "Password is incorrect.",
            });
            return;
        }

        const classList = await Schedule.aggregate([
            {
                $match: { _id: { $in: getEnroll.schedule } },
            },
            {
                $lookup: {
                    from: "subjects",
                    localField: "subject",
                    foreignField: "_id",
                    as: "subject",
                },
            },
            {
                $unwind: "$subject",
            },
            {
                $group: {
                    _id: "$subject._id",
                    subject: {
                        $first: {
                            _id: "$subject._id",
                            subjectCode: "$subject.subjectCode",
                            subjectName: "$subject.subjectName",
                            credits: "$subject.credits",
                            coef: "$subject.coef",
                        },
                    },
                    classList: {
                        $push: {
                            _id: "$_id",
                            className: "$className",
                            day: "$day",
                            shift: "$shift",
                            classroom: "$classroom",
                            teacher: "$teacher",
                        },
                    },
                },
            },
        ]);

        const mergedSchedules = mergeClass(classList);

        const result = {
            ...getEnroll.toObject(),
            schedule: mergedSchedules,
        };
        res.status(200).json({
            data: result,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Unknown error." });
    }
});

app.post("/api/checkEnroll/:enrollId", async (req, res) => {
    const { enrollId } = req.body;
    try {
        const getEnroll = await Enroll.findById(enrollId);
        if (getEnroll) res.status(200).json({ data: getEnroll });
        else res.status(200).json({ message: "Enroll doesn't exists." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Unknown error." });
    }
});

app.get("/api/getSubjectSemester/:enrollId", async (req, res) => {
    const { enrollId } = req.params;

    try {
        const enroll = await Enroll.findOne({ _id: enrollId });

        if (!enroll) {
            return res.status(404).json({ message: "Enroll not found." });
        }

        const classList = await Schedule.aggregate([
            {
                $match: { semester: enroll.semester },
            },
            {
                $lookup: {
                    from: "subjects",
                    localField: "subject",
                    foreignField: "_id",
                    as: "subject",
                },
            },
            {
                $unwind: "$subject",
            },
            {
                $group: {
                    _id: "$subject._id",
                    subject: {
                        $first: {
                            _id: "$subject._id",
                            subjectCode: "$subject.subjectCode",
                            subjectName: "$subject.subjectName",
                            credits: "$subject.credits",
                            coef: "$subject.coef",
                        },
                    },
                    classList: {
                        $push: {
                            _id: "$_id",
                            className: "$className",
                            day: "$day",
                            shift: "$shift",
                            classroom: "$classroom",
                            teacher: "$teacher",
                        },
                    },
                },
            },
        ]);

        const mergedSchedules = mergeClass(classList);

        return res.status(200).json({ data: mergedSchedules });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal Server Error." });
    }
});

app.post("/api/getCoefList", async (req, res) => {
    const { enrollId, password } = req.body;

    console.log(req.body);
    try {
        const getEnroll = await Enroll.findById(enrollId);
        console.log(getEnroll);
        //check password
        if (getEnroll.password != password) {
            return res.status(400).json({ message: "Password is incorrect." });
        }
        return res.json({
            unitPrice: getEnroll.unitPrice,
            coefList: getEnroll.coefList,
        });
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: "Updating coef list failed." });
    }
});

app.post("/api/updateCoefList", async (req, res) => {
    const { enrollId, password, unitPrice, coefList } = req.body;

    try {
        const updatedEnroll = await Enroll.findByIdAndUpdate(
            enrollId,
            {
                password,
                unitPrice,
                coefList: [...coefList],
            },
            {
                new: true, // Return the modified document
                runValidators: true, // Run validators for updates
                context: "query", // Make sure to select the document for version check
                upsert: false, // Do not create a new document if not found
                versionKey: false, // Do not include __v field in updates
            }
        );

        if (updatedEnroll) {
            if (updatedEnroll.password === password) {
                res.json({ message: "Updating coef list success." });
            } else {
                res.json({ message: "Access denied." });
            }
        } else {
            res.json({ message: "Enroll not found." });
        }
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: "Updating coef list failed." });
    }
});

app.post("/api/addPersonalSchedule", async (req, res) => {
    const { enrollId, password, schedule } = req.body;

    try {
        const existEnroll = await Enroll.findOneAndUpdate(
            { _id: enrollId, password: password },
            { $set: { schedule } },
            { new: true }
        );

        if (existEnroll) {
            res.status(200).json({ message: "Save data successful." });
        } else {
            res.status(404).json({
                message: "Can't find enroll id or password is incorrect.",
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Unknown error." });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server started on port", process.env.PORT || 3000);
});

module.exports = app;
