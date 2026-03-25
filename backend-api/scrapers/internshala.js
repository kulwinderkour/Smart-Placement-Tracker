const puppeteer = require('puppeteer');

const scrapeInternshala = async (skills) => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
  );

  // Set viewport to look like real browser
  await page.setViewport({ width: 1280, height: 800 });

  const skill = skills[0] || 'software';
  const url = `https://internshala.com/jobs/keywords-${skill.toLowerCase().replace(/\s+/g, '-')}-jobs/`;
  console.log('Scraping:', url);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for job cards to appear
    await page.waitForSelector('.internship_meta, .individual_internship', { timeout: 10000 });
  } catch (e) {
    console.log('Page load issue:', e.message);
  }

  // Log page HTML for debugging
  const html = await page.content();
  console.log('Page HTML length:', html.length);

  const jobs = await page.evaluate(() => {
    // Try multiple possible selectors
    const cards =
      document.querySelectorAll('.individual_internship') ||
      document.querySelectorAll('.internship-list-container .internship_meta');

    return Array.from(cards).slice(0, 15).map(card => {
      const titleEl = card.querySelector('.job-internship-name, .profile, h3 a');
      const companyEl = card.querySelector('.company-name, .company_name');
      const locationEl = card.querySelector('.location_link, .locations span, .location');
      const salaryEl = card.querySelector('.stipend, .salary');
      const linkEl = card.querySelector('a.job-title-href, a[href*="/job-detail/"]');

      return {
        title: titleEl?.innerText?.trim(),
        company: companyEl?.innerText?.trim(),
        location: locationEl?.innerText?.trim() || 'India',
        salary: salaryEl?.innerText?.trim(),
        applyUrl: linkEl
          ? 'https://internshala.com' + linkEl.getAttribute('href')
          : null,
        source: 'Internshala'
      };
    }).filter(j => j.title && j.applyUrl);
  });

  console.log('Scraped jobs count:', jobs.length);
  await browser.close();
  return jobs;
};

module.exports = { scrapeInternshala };
