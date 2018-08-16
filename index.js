// fetch data from main api page
// https://www.newamerica.org/api/post/?content_type=report

// for each result
// record url, id
// fetch "https://www.newamerica.org/api/report/" + id
// record result.title, result.url, result.data_project_external_script
// if result.sections[i].body contains block-dataviz
// record result.sections[i].slug
// getScreenshot

// getScreenshot(url, el)
// for each el with class .block-dataviz
// takeScreenshot
// save in folder result.title/result.slug

const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

async function queryApi(url) {
  const response = await fetch(url);
  const json = await response.json();
  handleResults(json);
}

async function handleResults(json) {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const nextUrl = json.next;
    const results = json.results;
    for (const reportMeta of results) {
      const id = reportMeta.id;
      const reportQuery = "https://www.newamerica.org/api/report/" + id;
      const reportResponse = await fetch(reportQuery);
      const report = await reportResponse.json();
      if (!report.error && report.detail != "Not found.") {
        const title = report.title;
        const date = report.date;
        const graphicScript = report.data_project_external_script;
        const sections = report.sections;
        const url = report.url;
        const reportSlug = path.basename(url);
        await getScreenshotsOfSections(browser, sections, url, reportSlug);
        console.log(report.title);
      }
    }
    queryApi(nextUrl);
    await browser.close();
  } catch (e) {
    console.log(e);
  }
  // results.forEach(report => {
  //   const id = report.id;
  //   const query = "https://www.newamerica.org/api/report/" + id;
  //   fetch(query)
  //     .then(res => res.json())
  //     .then(report => {
  //       if (report.id) {
  //         const title = report.title;
  //         const id = report.id;
  //         const date = report.date;
  //         const graphicScript = report.data_project_external_script;
  //         const sections = report.sections;
  //         const url = report.url;
  //         const reportSlug = path.basename(url);
  //         // for (var i = 0; i < sections.length; i++) {
  //         //   const hasGraphic = sections[i].body.includes("block-dataviz");
  //         //   if (hasGraphic) {
  //         //     const sectionSlug = sections[i].slug;
  //         //     const sectionUrl = "https://newamerica.org" + url + sectionSlug;
  //         //     captureScreenshot(sectionUrl, reportSlug, sectionSlug);
  //         //   }
  //         // }

  //       }
  //     });
  // });
  // queryApi(nextUrl);
}

async function getScreenshotsOfSections(browser, sections, url, reportSlug) {
  const hasGraphic = sections.some(section =>
    section.body.includes("block-dataviz")
  );
  console.log(hasGraphic);

  if (hasGraphic) {
    await fs.access("./screenshots/" + reportSlug, function(err) {
      if (err && err.code === "ENOENT") {
        fs.mkdir("./screenshots/" + reportSlug, err => console.log(err));
      }
    });
    for (const section of sections) {
      if (section.body.includes("block-dataviz")) {
        const sectionSlug = section.slug;
        const sectionUrl = "https://newamerica.org" + url + sectionSlug;
        await fs.access(
          "./screenshots/" + reportSlug + "/" + sectionSlug,
          function(err) {
            if (err && err.code === "ENOENT") {
              fs.mkdir("./screenshots/" + reportSlug + "/" + sectionSlug, err =>
                console.log(err)
              );
            }
          }
        );
        await captureScreenshot(browser, sectionUrl, reportSlug, sectionSlug);
      }
    }
  }
}

async function captureScreenshot(browser, url, dir, subDir) {
  try {
    async function captureScreenshotsOfElements(nodeList) {
      // console.log("Directory: " + dir + "   Sub directory: " + subDir);
      for (var i = 0; i < nodeList.length; i++) {
        try {
          // await page.waitFor(500);
          // await page.waitForNavigation({ waitUntil: 'networkidle' });
          // await nodeList[i].screenshot({
          //   path: `./screenshots/${dir}/${subDir}/${i}.png`
          // });
          await screenshotDOMElement({
            path: `./screenshots/${dir}/${subDir}/${i}.png`,
            el: nodeList[i],
            padding: 16
          });
        } catch (e) {
          console.log(e);
        }
      }
    }
    async function screenshotDOMElement(opts = {}) {
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
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1200 });
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.waitForSelector(".block-dataviz");
    const dataVizNodeList = await page.$$(".block-dataviz");
    // await fs.access("./screenshots/" + dir, function(err) {
    //   if (err && err.code === "ENOENT") {
    //     fs.mkdir("./screenshots/" + dir);
    //     fs.access("./screenshots/" + dir + "/" + subDir, function(err) {
    //       if (err && err.code === "ENOENT") {
    //         fs.mkdir("./screenshots/" + dir + "/" + subDir);
    //         captureScreenshotsOfElements(dataVizNodeList);
    //       }
    //     });
    //   }
    // });
    await captureScreenshotsOfElements(dataVizNodeList);
    await page.close();
  } catch (e) {
    console.log(e);
  }
}

queryApi("https://www.newamerica.org/api/post/?content_type=report");
