const app = require("express")();
require("dotenv").config();
const { Login } = require("./login");

app.get("/getYear", async (req, res) => {
    const page = await Login();
    await page.goto(
        "https://dangkyhoc.thanglong.edu.vn/ToanTruong/TKBToanTruong.aspx"
    );

    const listYear = await page.evaluate(() => {
        const option = document.querySelectorAll("#ctl00_c_droNam > option");
        const arr = [];
        option.forEach((item) => {
            arr.push({ value: item.value, text: item.text });
        });

        return arr;
    });

    res.send(listYear);
});

app.get("/getSemester/:year", async (req, res) => {
    try {
        const page = await Login();
        const year = req.params.year;
        console.log(year);

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

        res.send(listSemester);
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/getSchedule/:year/:semester", async (req, res) => {
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
        res.send(tableData);
    } catch (err) {
        console.error(err);
        return null;
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server started on port", process.env.PORT || 3000);
});

module.exports = app;
