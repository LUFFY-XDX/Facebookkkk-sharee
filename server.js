const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const path = require("path");

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/share", async (req, res) => {
  const { appState, postUrl, amount, delay } = req.body;

  if (!appState || !postUrl || !amount || !delay) {
    return res.status(400).json({ error: "Missing fields." });
  }

  try {
    const browser = await puppeteer.launch({
      executablePath: "/usr/bin/google-chrome-stable",
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    const cookies = JSON.parse(appState);
    await page.setCookie(...cookies);

    await page.goto("https://facebook.com", { waitUntil: "networkidle2" });

    for (let i = 0; i < amount; i++) {
      await page.goto(postUrl, { waitUntil: "networkidle2" });

      try {
        await page.waitForSelector('[aria-label="Share"]', { timeout: 10000 });
        await page.click('[aria-label="Share"]');
        await page.waitForTimeout(1500);

        const shareNowBtn = await page.$x("//span[contains(text(), 'Share now (Public)')]");
        if (shareNowBtn.length > 0) {
          await shareNowBtn[0].click();
        }

        await page.waitForTimeout(delay * 1000);
      } catch (err) {
        console.error(`Failed on iteration ${i + 1}:`, err.message);
      }
    }

    await browser.close();
    res.json({ success: true, message: "Sharing complete." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to share post." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
