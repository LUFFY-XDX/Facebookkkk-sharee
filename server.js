const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

puppeteer.use(StealthPlugin());
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/share', async (req, res) => {
  const { appstate, postUrl, shares, delay } = req.body;

  if (!appstate || !postUrl || !shares || !delay) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const cookies = typeof appstate === 'string' ? JSON.parse(appstate) : appstate;

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    await page.setCookie(...cookies);
    await page.goto('https://facebook.com', { waitUntil: 'domcontentloaded' });

    for (let i = 0; i < shares; i++) {
      console.log(`Sharing #${i + 1}`);

      await page.goto(postUrl, { waitUntil: 'domcontentloaded' });

      
      await page.waitForSelector('div[aria-label="Share"]', { timeout: 10000 });
      await page.click('div[aria-label="Share"]');

      
      await page.waitForTimeout(1000);
      await page.evaluate(() => {
        const shareOptions = [...document.querySelectorAll('span')].find(
          el => el.textContent.includes('Share now') || el.textContent.includes('Share to Feed')
        );
        if (shareOptions) shareOptions.click();
      });

      
      await page.waitForTimeout(delay * 1000);
    }

    await browser.close();
    return res.json({ success: true, message: 'Post shared successfully.' });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Something went wrong. Make sure AppState and post URL are valid.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
