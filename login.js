require("dotenv").config();

let chrome = {};
let puppeteer;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    chrome = require("chrome-aws-lambda");
    puppeteer = require("puppeteer-core");
} else {
    puppeteer = require("puppeteer");
}

async function Login() {
    let options = {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    };

    const browser = await puppeteer.launch(options);
    let page = await browser.newPage();

    await page.goto("https://dangkyhoc.thanglong.edu.vn/");
    await page.type("#tbUserName", process.env.USERNAME_ACCOUNT);
    await page.type("#tbPassword", process.env.PASSWORD_ACCOUNT);
    await Promise.all([page.click("#btLogin"), page.waitForNavigation()]);
    return page;
}

exports.Login = Login;
