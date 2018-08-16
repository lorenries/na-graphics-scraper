const fetch = require("node-fetch");
const fs = require("fs");
const URL = require("url");
const path = require("path");
const puppeteer = require("puppeteer");

const REPORTS = "https://www.newamerica.org/reports/";

(async () => {
  const links = { indepth: [], reports: [] };
  const browser = await puppeteer.launch({ headless: false }); // { headless: false }
  const page = await browser.newPage();
  await page.setViewport({
    width: 1200,
    height: 1200
  });
  await page.goto(REPORTS, {
    waitUntil: "networkidle2"
  });
  for (let i = 0; i < 5; i++) {
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
  await page.waitForSelector(".program__publications-list > .report > a");
  const reportLinks = await page.evaluate(() => {
    const links = Array.from(
      document.querySelectorAll(".program__publications-list > .report > a")
    );
    return links.map(link => link.href);
  });
  // console.log(inDepthLinks);
  // console.log(reportLinks);
  for (link of inDepthLinks) {
    await handleInDepth(link, browser);
  }
  // for (link of reportLinks) {
  //   await handleReport(link, browser);
  // }
  await browser.close();
})();

async function handleInDepth(link, browser) {
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1200 });
    await page.goto(link, { waitUntil: "networkidle2" });
    await lookForBlocks(page);
  } catch (e) {
    console.log(e);
  }
}

async function handleReport(link, browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1200 });
  await page.goto(link, { waitUntil: "networkidle2" });
}

async function lookForBlocks(page) {
  const blocks = await page.$$(".block-dataviz");
  const urlPath = URL.parse(await page.url()).pathname;
  const dir = path.basename(urlPath);

  if (blocks.length > 0) {
    await captureScreenshots(page, blocks, dir);
  }
}

async function captureScreenshots(page, nodeList, dir) {
  await fs.access("./screenshots/" + dir, function(err) {
    if (err && err.code === "ENOENT") {
      fs.mkdir("./screenshots/" + dir, err => console.log(err));
    }
  });
  for (var i = 0; i < nodeList.length; i++) {
    try {
      // await nodeList[i].screenshot({
      //   path: `./screenshots/${dir}/${subDir}/${i}.png`
      // });
      // await screenshotDOMElement({
      //   path: `./screenshots/${dir}/${i}.png`,
      //   el: nodeList[i],
      //   padding: 16,
      //   page: page
      // });
      await nodeList[i].screenshot({ path: `./screenshots/${dir}/${i}.png` });
    } catch (e) {
      console.log(e);
    }
  }
}

async function screenshotDOMElement(opts = {}) {
  const padding = "padding" in opts ? opts.padding : 0;
  const path = "path" in opts ? opts.path : null;
  const element = opts.el;
  const page = opts.page;

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
