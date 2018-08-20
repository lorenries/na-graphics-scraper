const fs = require("fs");
const URL = require("url");
const path = require("path");
const puppeteer = require("puppeteer");
const slugify = require("slugify");
request = require("request");

const REPORTS = "https://www.newamerica.org/reports/";
const results = [];
crawl();

async function crawl() {
  const browser = await puppeteer.launch({ headless: true }); // { headless: false }
  const page = await browser.newPage();
  await page.setViewport({
    width: 1200,
    height: 1200
  });
  await page.goto(REPORTS, {
    waitUntil: "networkidle2"
  });
  for (let i = 0; i < 30; i++) {
    await page.waitFor(1000);
    let readMore = await page.$(".program__publications-list-load-more a");
    await readMore.click();
  }
  await page.waitForSelector(
    ".program__publications-list > .indepthproject > a"
  );
  const inDepthLinks = await page.evaluate(() => {
    const links = Array.from(
      document.querySelectorAll(
        ".program__publications-list > .indepthproject > a"
      )
    );
    return links.map(link => link.href);
  });
  inDepthLinks.push(
    "https://www.newamerica.org/in-depth/mapping-financial-opportunity/"
  );
  inDepthLinks.push(
    "https://www.newamerica.org/in-depth/transforming-early-education-workforce/"
  );
  await page.waitForSelector(".program__publications-list > .report > a");
  const reportLinks = await page.evaluate(() => {
    const links = Array.from(
      document.querySelectorAll(".program__publications-list > .report > a")
    );
    return links.map(link => link.href);
  });
  async function inDepthLoop(inDepthLinks) {
    for (link of inDepthLinks) {
      await handleInDepth(link, browser);
      console.log(link);
    }
  }
  await inDepthLoop(inDepthLinks);
  async function reportLoop(reportLinks) {
    for (link of reportLinks) {
      await handleReport(link, browser);
      console.log(link);
    }
  }
  await reportLoop(reportLinks);
  console.log(results);
  fs.writeFile("./public/results.json", JSON.stringify(results), e => {
    if (e) console.log(e);
  });
  await browser.close();
}

async function handleInDepth(link, browser) {
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 2000, height: 10000 });
    await page.goto(link, { waitUntil: "networkidle2" });
    const reportTitle = await page.evaluate(() => {
      return document.querySelector("h1").innerText;
    });
    const tocLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll(".contents-panel a"));
      return links.map(link => link.href);
    });
    await lookForBlocks(page, slugify(reportTitle, { lower: true }));
    await tocLoop(browser, tocLinks, reportTitle);
  } catch (e) {
    console.log(e);
  }
}

async function handleReport(link, browser) {
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 2000, height: 10000 });
    await page.goto(link, { waitUntil: "networkidle2" });
    await page.waitFor("h1");
    const reportTitle = await page.evaluate(() => {
      return document.querySelector("h1").innerText;
    });
    const tocLinks = await page.evaluate(() => {
      const links = Array.from(
        document.querySelectorAll(
          ".report__content-menu a.report__content-menu__section"
        )
      );
      return links.map(link => link.href);
    });
    const images = await page.evaluate(() => {
      const graphics = [];
      const img = document.querySelectorAll("img");
      img.forEach(el => {
        if (
          el.src.includes("fig") ||
          el.src.includes("graphic") ||
          el.src.includes("map") ||
          el.src.includes("Fig") ||
          el.src.includes("Graphic") ||
          el.src.includes("Map")
        ) {
          graphics.push(el.src);
        }
      });
      return graphics;
    });
    console.log(images);
    if (images.length > 0) {
      await downloadStaticImages(
        images,
        slugify(reportTitle, { lower: true }, await page.url(), reportTitle)
      );
    }
    await lookForBlocks(page, slugify(reportTitle, { lower: true }));
    await tocLoop(browser, tocLinks, reportTitle);
  } catch (e) {
    console.log(e);
  }
}

async function tocLoop(browser, tocLinks, reportTitle) {
  console.log(tocLinks);
  for (link of tocLinks) {
    console.log(link);
    const page = await browser.newPage();
    await page.setViewport({ width: 2000, height: 10000 });
    await page.goto(link, { waitUntil: "networkidle0" });
    await lookForBlocks(page, reportTitle);
  }
}

async function downloadStaticImages(images, dir, pageUrl, pageTitle) {
  await fs.access("./public/screenshots/" + dir, function(err) {
    if (err && err.code === "ENOENT") {
      fs.mkdir("./public/screenshots/" + dir, err => console.log(err));
    }
  });
  async function download(url, fileName, callback) {
    request.head(url, function(err, res, body) {
      request(url)
        .pipe(
          fs.createWriteStream("./public/screenshots/" + dir + "/" + fileName)
        )
        .on("close", callback);
    });
  }
  for (let i = 0; i < images.length; i++) {
    const fileName = path.parse(images[i]).base;
    await download(images[i], fileName, function() {
      results.push({
        path: `./public/screenshots/${dir}/${fileName}`,
        url: pageUrl,
        title: pageTitle
      });
    });
  }
}

async function lookForBlocks(page, reportTitle) {
  const blocks = await page.$$(".block-dataviz");
  await page.evaluate(() => {
    const cookieNotification = document.querySelector(".cookies-notification");
    if (cookieNotification) {
      cookieNotification.style.display = "none";
    }
  });
  const urlPath = URL.parse(await page.url()).pathname;
  const dir = slugify(reportTitle, { lower: true });
  console.log(dir);
  if (blocks.length > 0) {
    console.log("found ur block");
    await captureScreenshots(page, blocks, dir, reportTitle);
  }
  await page.close();
}

async function captureScreenshots(page, nodeList, dir, pageTitle) {
  await fs.access("./public/screenshots/" + dir, function(err) {
    if (err && err.code === "ENOENT") {
      fs.mkdir("./public/screenshots/" + dir, err => console.log(err));
    }
  });
  for (var i = 0; i < nodeList.length; i++) {
    try {
      const fileName = Date.now();
      await screenshotDOMElement({
        path: `./public/screenshots/${dir}/${fileName}.png`,
        el: nodeList[i],
        padding: 16,
        page: page
      });
      results.push({
        path: `./public/screenshots/${dir}/${fileName}.png`,
        url: page.url(),
        title: pageTitle
      });
    } catch (e) {
      console.log(e);
    }
  }
}

async function screenshotDOMElement(opts = {}) {
  const page = opts.page;
  const padding = "padding" in opts ? opts.padding : 0;
  const path = "path" in opts ? opts.path : null;
  const element = opts.el;

  const rect = await page.evaluate(element => {
    if (!element) return null;
    const { x, y, width, height } = element.getBoundingClientRect();
    return { left: x, top: y, width, height, id: element.id };
  }, element);

  if (!rect)
    throw Error(`Could not find element that matches element: ${element}.`);

  return await page.screenshot({
    path,
    clip: {
      x: rect.left - padding,
      y: rect.top - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2
    }
  });
}
