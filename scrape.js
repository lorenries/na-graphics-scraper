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
  fs.writeFile("./results.json", JSON.stringify(results), e => {
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
    // page.waitFor(1000);
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
  // try {
  //   await page.waitForSelector(".block-dataviz", { timeout: 1000 });
  // } catch (e) {
  //   console.log(e);
  // }
  const blocks = await page.$$(".block-dataviz");
  await page.evaluate(() => {
    const cookieNotification = document.querySelector(".cookies-notification");
    if (cookieNotification) {
      cookieNotification.style.display = "none";
    }
  });
  // console.log(blocks);
  const urlPath = URL.parse(await page.url()).pathname;
  // const dir = path.basename(urlPath);
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
  // async function loopThroughBlocks() {
  for (var i = 0; i < nodeList.length; i++) {
    try {
      const fileName = Date.now();
      await screenshotDOMElement({
        path: `./public/screenshots/${dir}/${fileName}.png`,
        el: nodeList[i],
        padding: 16,
        page: page
      });
      // await nodeList[i].screenshot({
      //   path: `./screenshots/${dir}/${Date.now()}.png`
      // });
      results.push({
        path: `./public/screenshots/${dir}/${fileName}.png`,
        url: page.url(),
        title: pageTitle
      });
    } catch (e) {
      console.log(e);
    }
    // }
  }
  // await loopThroughBlocks();
}

async function screenshotDOMElement(opts = {}) {
  const page = opts.page;
  const padding = "padding" in opts ? opts.padding : 0;
  const path = "path" in opts ? opts.path : null;
  const element = opts.el;

  const rect = await page.evaluate(element => {
    // const element = document.querySelector(selector);
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

const allLinks = [
  "https://www.newamerica.org/in-depth/family-engagement-digital-age/",
  "https://www.newamerica.org/in-depth/stronger-teaching-and-caregiving-californias-youngest/",
  "https://www.newamerica.org/in-depth/prek12-oer-in-practice/",
  "https://www.newamerica.org/in-depth/mapping-instructional-leadership/",
  "https://www.newamerica.org/in-depth/anti-muslim-activity/",
  "https://www.newamerica.org/in-depth/laboratories-of-democracy/",
  "https://www.newamerica.org/in-depth/weather-eye-stories-front/",
  "https://www.newamerica.org/in-depth/transforming-early-education-workforce/",
  "https://www.newamerica.org/in-depth/bwii-responsible-asset-allocator/",
  "https://www.newamerica.org/in-depth/malware-markets/",
  "https://www.newamerica.org/in-depth/measuring-broadband-alexandrias-schools/",
  "https://www.newamerica.org/in-depth/pre-k-leaders/",
  "https://www.newamerica.org/in-depth/varying-degrees/",
  "https://www.newamerica.org/in-depth/world-of-drones/",
  "https://www.newamerica.org/in-depth/americas-counterterrorism-wars/",
  "https://www.newamerica.org/in-depth/mapping-financial-opportunity/",
  "https://www.newamerica.org/in-depth/getting-internet-companies-do-right-thing/",
  "https://www.newamerica.org/in-depth/weather-eye/",
  "https://www.newamerica.org/in-depth/care-report/",
  "https://www.newamerica.org/in-depth/terrorism-in-america/",
  "https://www.newamerica.org/in-depth/undermining-pell/"
];

const allReportLinks = [
  ("https://www.newamerica.org/cybersecurity-initiative/reports/idealized-internet-vs-internet-realities/",
  "https://www.newamerica.org/millennials/reports/millennials-initiative-new-america-2018/",
  "https://www.newamerica.org/future-property-rights/reports/punjab-example/",
  "https://www.newamerica.org/bretton-woods-ii/blockchain-trust-accelerator/reports/bellagio-blockchain-summit-outcomes-and-insights/",
  "https://www.newamerica.org/education-policy/reports/dual-language-learner-data-gaps/",
  "https://www.newamerica.org/education-policy/reports/lessons-three-california-communities-strengthening-early-education/",
  "https://www.newamerica.org/family-centered-social-policy/reports/racialized-costs-banking/",
  "https://www.newamerica.org/international-security/reports/airstrikes-and-civilian-casualties-libya/",
  "https://www.newamerica.org/international-security/reports/revolution-muslim-islamic-state/",
  "https://www.newamerica.org/cybersecurity-initiative/reports/cybersecurity-states-lessons-across-america/",
  "https://www.newamerica.org/bretton-woods-ii/reports/afraid-what/",
  "https://www.newamerica.org/resource-security/reports/phase-zero-digital-toolbox/",
  "https://www.newamerica.org/better-life-lab/reports/summer-care-gap/",
  "https://www.newamerica.org/education-policy/reports/navigating-new-curriculum-landscape/",
  "https://www.newamerica.org/education-policy/reports/varying-degrees-2018/",
  "https://www.newamerica.org/work-workers-technology/reports/automation-potential-jobs-indianapolis/",
  "https://www.newamerica.org/education-policy/reports/ensuring-smooth-pathway/",
  "https://www.newamerica.org/resource-security/reports/energy-innovation-and-national-security-retreat/",
  "https://www.newamerica.org/education-policy/reports/wealth-gap-plus-debt/",
  "https://www.newamerica.org/oti/reports/tv-royalty/",
  "https://www.newamerica.org/education-policy/reports/extracting-success-pre-k-teaching/",
  "https://www.newamerica.org/international-security/reports/iraq-after-isis-what-do-now/",
  "https://www.newamerica.org/cybersecurity-initiative/reports/securing-digital-dividends/",
  "https://www.newamerica.org/work-workers-technology/reports/automation-potential-jobs-phoenix/",
  "https://www.newamerica.org/education-policy/reports/higher-education-act-1965/",
  "https://www.newamerica.org/better-life-lab/reports/mission-visible/",
  "https://www.newamerica.org/ca/reports/what-can-you-do-about-algorithmic-bias/",
  "https://www.newamerica.org/millennials/reports/millennial-research-findings-and-data/",
  "https://www.newamerica.org/better-life-lab/reports/paid-family-leave-how-much-time-enough/",
  "https://www.newamerica.org/better-life-lab/reports/better-work-toolkit/",
  "https://www.newamerica.org/education-policy/reports/predictive-analytics-higher-education/",
  "https://www.newamerica.org/better-life-lab/reports/guide-talking-women-peace-and-security-inside-us-security-establishment/")
];
