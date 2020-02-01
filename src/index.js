/**
 * User: abhijit.baldawa
 */

const {baseUrl, concurrency, outputFile, retryLimit} = require("./site");
const Crawler = require("./crawler");
const store = require("./store");

(async ()=>{
    console.time("totaltime");

    // 1. Init and delete any previous result file
    store.init(outputFile);

    // 2. Initialize the crawler
    const crawler = new Crawler({baseUrl, concurrency, retryLimit});
    crawler.addToQueue(baseUrl);

    console.log(`Started crawling with baseUrl=${baseUrl}, concurrency = ${concurrency}, outputFile name = ${outputFile} and retryLimit = ${retryLimit} `);

    // 3. For every html scraped, save the static assets dependency and add links to the queue
    for await(const {html, currentUrl, totalLinks} of crawler.crawl()) {
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
        console.log(`totalLinks = ${totalLinks}, currentUrl = ${currentUrl}, totalLinksAddedToQueue = ${totalLinksAddedToQueue.length}, queue length = ${crawler.getQueueLength()}`);
    }

    // 4. Generate and save sitemap file to the disk
    store.createJsonResult();

    // 5. Log crawler stats
    console.log(`*********************** Crawling Ended ****************************
     1] Total unique links crawled = ${crawler.getUniqueUrlsCount()}
     2] Total links successfully saved = ${store.getStoreLength()}
     3] Total links failed = ${crawler.getFailedUrlsCount()}
     4] Output file = ${store.getOutputFilePath()}`);
    console.timeEnd("totaltime");
})();

