const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
puppeteer.use(stealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/share', async (req, res) => {
  const { appState, postUrl, count, delay } = req.body;

  if (!Array.isArray(appState) || !postUrl || !count || !delay) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const cookies = appState.map(cookie => ({
    name: cookie.key,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    httpOnly: cookie.httpOnly || false,
    secure: cookie.secure || false
  }));

  await page.setCookie(...cookies);

  try {
    await page.goto('https://www.facebook.com', { waitUntil: 'networkidle2' });

    const postId = postUrl.split('/').pop().split('?')[0];
    const shareLink = `https://www.facebook.com/sharer/sharer.php?u=https://www.facebook.com/${postId}`;

    for (let i = 0; i < count; i++) {
      const newPage = await browser.newPage();
      await newPage.setCookie(...cookies);
      await newPage.goto(shareLink, { waitUntil: 'networkidle2' });
      await newPage.waitForTimeout(2000);
      await newPage.click('button[name="__CONFIRM__"]');
      await newPage.close();
      await page.waitForTimeout(delay * 1000);
    }

    await browser.close();
    res.json({ success: true, message: 'Shares complete' });
  } catch (err) {
    await browser.close();
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
