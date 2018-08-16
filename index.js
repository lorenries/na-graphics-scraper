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

function queryApi(url) {
  fetch(url)
    .then(res => res.json())
    .then(json => handleResults(json));
}

function handleResults(json) {
  const nextUrl = json.next;
  const results = json.results;
  results.forEach(report => {
    const id = report.id;
    const query = "https://www.newamerica.org/api/report/" + id;
    fetch(query)
      .then(res => res.json())
      .then(report => {
        if (report.id) {
          const title = report.title;
          const id = report.id;
          const date = report.date;
          const graphicScript = report.data_project_external_script;
          const url = report.url;
          const sections = report.sections;
          const reportSlug = path.basename(url);
          sections.forEach(section => {
            const hasGraphic = section.body.includes("block-dataviz");
            if (hasGraphic) {
              const sectionSlug = section.slug;
              const sectionUrl = "https://newamerica.org" + url + sectionSlug;
              captureScreenshot(sectionUrl, reportSlug, sectionSlug);
            }
          });
        }
      });
  });
  queryApi(nextUrl);
}

async function captureScreenshot(url, dir, subDir) {
  async function captureScreenshotsOfElements(nodeList) {
    for (var i = 0; i < nodeList.length; i++) {
      try {
        await nodeList[i].screenshot({
          path: `./screenshots/${dir}/${subDir}/${i}.png`
        });
      } catch (e) {
        console.log(e);
      }
    }
  }
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 2200, height: 10000 });
    await page.goto(url);
    await page.waitFor(5000);
    // console.log(url);
    const dataVizNodeList = await page.$$(".block-dataviz");
    // console.log(dataVizNodeList);
    captureScreenshotsOfElements(dataVizNodeList);
    await browser.close();
  } catch (e) {
    console.log(e);
  }
}

queryApi("https://www.newamerica.org/api/post/?content_type=report");
