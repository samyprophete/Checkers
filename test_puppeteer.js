const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('dialog', dialog => {
      console.log('ALERT FOUND:', dialog.message());
      dialog.dismiss();
  });
  await page.goto('http://localhost:3000');
  
  // click start
  await page.click('#btn-easy');
  await page.waitForTimeout(500);

  // click white piece 12 which is at [5, 2] maybe?
  // Let's just find all dark cells, their dataset, and click one that has a white piece
  const cells = await page.$$('.cell.dark');
  let selected = false;
  for (const cell of cells) {
      const pc = await cell.$('.piece.white');
      if (pc) {
          await cell.click();
          await page.waitForTimeout(200);
          // if any highlight-dest appears
          const dests = await page.$$('.highlight-dest');
          if (dests.length > 0) {
              await dests[0].click();
              selected = true;
              break;
          }
      }
  }

  await page.waitForTimeout(500);

  // let AI move
  await page.waitForTimeout(1000);
  
  // now we take another move
  for (const cell of cells) {
      const pc = await cell.$('.piece.white');
      if (pc) {
          await cell.click();
          await page.waitForTimeout(200);
          // if any highlight-dest appears
          const dests = await page.$$('.highlight-dest');
          if (dests.length > 0) {
              await dests[0].click();
              break;
          }
      }
  }
  
  await page.waitForTimeout(1000);
  
  await browser.close();
})();
