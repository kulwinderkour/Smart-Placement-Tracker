const puppeteer = require("puppeteer");

const scrapeNaukri = async (skills) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  });
  await page.goto(
    `https://www.naukri.com/jobs-in-india?k=${encodeURIComponent(skills)}`,
    { waitUntil: "networkidle2", timeout: 30000 }
  );
  const jobs = await page.evaluate(() => {
    const cards = document.querySelectorAll(".srp-jobtuple-wrapper");
    return Array.from(cards)
      .slice(0, 15)
      .map((card) => {
        const titleEl = card.querySelector(".title");
        const companyEl = card.querySelector(".comp-name");
        const locationEl = card.querySelector(".locWdth");
        const salaryEl = card.querySelector(".salary-snippet");
        const linkEl = card.querySelector("a.title");
        return {
          title: titleEl?.innerText?.trim(),
          company: companyEl?.innerText?.trim(),
          location: locationEl?.innerText?.trim() || "India",
          salary: salaryEl?.innerText?.trim(),
          applyUrl: linkEl?.href || null,
          source: "Naukri",
        };
      })
      .filter((j) => j.title && j.applyUrl);
  });
  await browser.close();
  return jobs;
};

module.exports = { scrapeNaukri };
