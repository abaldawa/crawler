/**
 * User: abhijit.baldawa
 */

const {baseUrl, concurrency, outputFile} = require("./site");
const Crawler = require("./crawler");
const store = require("./store");

(async ()=>{
    console.time("totaltime");
    console.log("Started crawling...");

    // 1. Init and delete any previous result file
    store.init(outputFile);

    // 2. Initialize the crawler
    const crawler = new Crawler({baseUrl, concurrency});
    crawler.addToQueue(baseUrl);

    // 3. For every html scraped, save the static assets dependency and add links to the queue
    for await(const {html, currentUrl, counter, queueLength} of crawler.crawl()) {
        const scriptSrcs = Crawler.getAttributesBySelector("script", "src", html);
        const linkHrefs = Crawler.getAttributesBySelector("link", "href", html);
        const imgSrcs = Crawler.getAttributesBySelector("img", "src", html);
        const totalLinksAddedToQueue = Crawler.getAttributesBySelector("a", "href", html)
                                        .map(link=>crawler.addToQueue(link))
                                        .filter(Boolean);

        store.save({
            url: currentUrl,
            dependencies: {
                js: scriptSrcs,
                link: linkHrefs,
                image: imgSrcs
            }
        });
        console.log(`counter = ${counter}, currentUrl = ${currentUrl}, queue length = ${queueLength}, totalLinksAddedToQueue = ${totalLinksAddedToQueue.length}`);
    }

    // 4. Generate and save sitemap file to the disk
    store.createJsonResult();

    console.log(`Ended. Total links crawled = ${crawler.getUniqueUrls().length}`);
    console.timeEnd("totaltime");
})();

