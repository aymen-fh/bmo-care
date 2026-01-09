const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    const html = `<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>Test</title>
  <style>body{font-family:sans-serif}</style>
</head>
<body>مرحبا</body>
</html>`;

    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    console.log('OK pdf bytes:', pdf.length);

    await browser.close();
  } catch (e) {
    console.error('PUPPETEER_TEST_FAILED');
    console.error(e && (e.stack || e));
    process.exit(1);
  }
})();
