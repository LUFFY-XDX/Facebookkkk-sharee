const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/share', async (req, res) => {
  const { appState, postUrl, count, delay } = req.body;

  if (!appState || !postUrl || !count || !delay) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox'],
    });
    const page = await browser.newPage();

    const cookies = JSON.parse(appState);
    await page.setCookie(...cookies);

    await page.goto('https://www.facebook.com', { waitUntil: 'networkidle2' });

    const results = [];

    for (let i = 0; i < count; i++) {
      try {
        await page.goto(postUrl, { waitUntil: 'networkidle2' });

        await page.waitForSelector('[aria-label="Send this to friends or post it on your timeline."]', { timeout: 10000 });
        await page.click('[aria-label="Send this to friends or post it on your timeline."]');

        await page.waitForSelector('[aria-label="Share now (Public)"], [aria-label="Share now"]', { timeout: 10000 });
        await page.click('[aria-label="Share now (Public)"], [aria-label="Share now"]');

        results.push(`Share ${i + 1} success`);
      } catch (err) {
        results.push(`Share ${i + 1} failed: ${err.message}`);
      }

      await new Promise(r => setTimeout(r, delay * 1000));
    }

    res.json({ status: 'completed', results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
