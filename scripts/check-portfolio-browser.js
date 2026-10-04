async (page) => {
  const results = [];
  const errors = [];
  const failures = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => {
    if (response.url().startsWith("http://127.0.0.1:4173/") && response.status() >= 400) failures.push({url: response.url(), status: response.status()});
  });
  for (const path of ["/", "/projects/spot.html"]) {
    await page.goto("http://127.0.0.1:4173" + path);
    for (const width of [320, 375, 390, 768, 1440]) {
      await page.setViewportSize({width, height: 900});
      results.push(await page.evaluate(() => ({
        path: location.pathname,
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        brokenImages: [...document.images].filter(image => image.complete && !image.naturalWidth).length,
        h1Count: document.querySelectorAll("h1").length
      })));
    }
  }
  await page.goto("http://127.0.0.1:4173/");
  const playback = [];
  for (const video of await page.locator("video").all()) {
    await video.evaluate(element => element.load());
    playback.push(await video.evaluate(async element => {
      await element.play();
      const playable = !element.paused;
      element.pause();
      return {playable, duration: element.duration, width: element.videoWidth, height: element.videoHeight};
    }));
  }
  await page.emulateMedia({reducedMotion: "reduce"});
  const motion = await page.evaluate(() => ({
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    buttonTransition: getComputedStyle(document.querySelector(".button")).transitionDuration,
    autoplay: [...document.querySelectorAll("video")].some(video => video.autoplay)
  }));
  await page.locator("summary").first().focus();
  await page.keyboard.press("Space");
  const keyboardOpened = await page.locator("details").first().evaluate(element => element.open);
  await page.keyboard.press("Space");
  const keyboardClosed = await page.locator("details").first().evaluate(element => !element.open);
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(() => window.scrollTo(0,0));
  await page.screenshot({path:"output/playwright/desktop.png"});
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(() => window.scrollTo(0,0));
  await page.screenshot({path:"output/playwright/mobile.png"});
  const context = await page.context().browser().newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const noJsPage = await context.newPage();
  await noJsPage.goto("http://127.0.0.1:4173/");
  const noJs = {title:await noJsPage.title(), contact:await noJsPage.locator("#contact").count(), workLinks:await noJsPage.locator('a[href="projects/spot.html"]').count(), cvLinks:await noJsPage.locator('a[href="assets/documents/markus-lejon-cv-2026.pdf"]').count()};
  await context.close();
  if (errors.length || failures.length || results.some(result => result.scrollWidth > result.width || result.brokenImages || result.h1Count !== 1) || playback.length !== 2 || playback.some(result => !result.playable) || !keyboardOpened || !keyboardClosed || noJs.cvLinks !== 2) throw new Error("Portfolio browser checks failed");
  return {results, errors, failures, playback, motion, noJs, keyboardOpened, keyboardClosed};
}
