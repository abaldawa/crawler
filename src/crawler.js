/**
 * User: abhijit.baldawa
 */

const puppeteer = require('puppeteer');
const normalizeUrl = require('normalize-url');
const $ = require('cheerio');

class Crawler {
    #baseUrl;
    #queue = [];
    #uniqueUrls = [];
    #concurrency;
    #retryLimit;
    #failedUrlsToNumOfRetries = {};
    #failedUrlStatus = Object.freeze({
        EXCEEDED_RETRY_LIMIT: "RETRY_LIMIT_EXCEEDED",
        RETRYING: "RETRYING",
        NO_RETRY_LIMIT_SET: "NO_RETRY_LIMIT_SET"
    });

    constructor({baseUrl, concurrency = 3, retryLimit = 3}) {
        this.#baseUrl = baseUrl;
        this.#concurrency = concurrency;
        this.#retryLimit = retryLimit;
    }

    /**
     * Returns the number of URL's from the queue based on concurrency
     * set by the user.
     *
     * @return {string[]} - Array of URL's to crawl parallelly
     */
    getUrlsFromQueue() {
        return new Array(this.#concurrency)
                .fill(true)
                .map(()=>this.#queue.shift())
                .filter(Boolean);
    }

    /**
     * This methods checks below:
     * 1] If there is a retry limit set and is greater than 0
     * 2] If step 1 is yes then checks whether the failedUrl has failed for the first time
     * 3] If step 2 is yes then tracks the failedUrl and pushes the failedUrl to the queue again
     * 4] If step 2 is no then checks whether failedUrl has not breached retryLimit set by user for a failed URL
     *    If no then retry again or else does not retry
     * @param {string} failedUrl
     * @return {string} - Status whether failedUrl is added to the queue or not
     */
    checkAndPushToQueueForRetry( failedUrl ) {
        if( this.#retryLimit > 0 ) {
            if( !this.#failedUrlsToNumOfRetries[failedUrl] ) {
                this.#failedUrlsToNumOfRetries[failedUrl] = 1;
                this.#queue.unshift(failedUrl);
                return this.#failedUrlStatus.RETRYING;
            } else if( this.#failedUrlsToNumOfRetries[failedUrl] < this.#retryLimit ){
                this.#failedUrlsToNumOfRetries[failedUrl]++;
                this.#queue.unshift(failedUrl);
                return this.#failedUrlStatus.RETRYING;
            } else {
                return this.#failedUrlStatus.EXCEEDED_RETRY_LIMIT;
            }
        }

        return this.#failedUrlStatus.NO_RETRY_LIMIT_SET;
    }

    /**
     * If successfulUrl present in failedUrlsToNumOfRetries then deletes the url
     * from the cache.
     *
     * @param {string} successfulUrl
     * @return {boolean}
     */
    checkAndRemoveUrlFromFailedUrlsCache( successfulUrl ) {
        if(this.#failedUrlsToNumOfRetries[successfulUrl]) {
            delete this.#failedUrlsToNumOfRetries[successfulUrl];
            return true;
        }

        return false;
    }

    /**
     * This async generator function yields the results of a crawled html page and can be used with for await of loop
     * This method respects the concurrency passed to it in the constructor and scrapes those requests concurrently.
     *
     * @return {AsyncGenerator<{html: string, currentUrl: string, totalLinks: number}, void, ?>}
     */
    async *crawl() {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        let counter = 0;

        while( this.#queue.length ) {
            const urlsToCrawl = this.getUrlsFromQueue();
            const promisesArr = urlsToCrawl.map( async currentUrl => {
                                    try{
                                        await page.goto(currentUrl);
                                        const html = await page.content();
                                        counter++;

                                        if(this.checkAndRemoveUrlFromFailedUrlsCache(currentUrl)) {
                                            console.log(`Crawler: successfully retried URL = ${currentUrl}`);
                                        }

                                        return {html, currentUrl, totalLinks: counter };
                                    } catch(e) {
                                        const willRetry = this.checkAndPushToQueueForRetry(currentUrl);
                                        const errMsg = `Crawler: Error fetching content from URL: ${currentUrl}. Error: ${e}`;

                                        switch( willRetry ) {
                                            case this.#failedUrlStatus.NO_RETRY_LIMIT_SET:
                                                console.warn(`${errMsg}. No retry limit set. Skipping...`);
                                                break;
                                            case this.#failedUrlStatus.EXCEEDED_RETRY_LIMIT:
                                                console.warn(`${errMsg}. Retry limit = ${this.#retryLimit} reached. Skipping...`);
                                                break;
                                            case this.#failedUrlStatus.RETRYING:
                                                console.warn(`${errMsg}. Retrying later...`);
                                                break;
                                        }
                                    }
                                 } );

            const results = await Promise.all(promisesArr);

            for(const result of results) {
                if(result) {
                    yield result;
                }
            }
        }
        await browser.close();
    }

    /**
     * This method adds URL to the crawler queue
     *
     * @param {string} URL - Url to add to the crawler queue
     * @return {boolean} - true if successful else false
     */
    addToQueue( URL ) {
        if( URL.startsWith("/") ) {
            URL = `${this.#baseUrl}${URL}`;
        } else if( URL.startsWith("#") ) {
            return false;
        } else if( !URL.startsWith(this.#baseUrl) ) {
            return false;
        }

        const normalisedURL = normalizeUrl(URL, {stripHash: true});

        if( this.#uniqueUrls.includes(normalisedURL) ) {
            return false;
        }

        this.#queue.push(URL);
        this.#uniqueUrls.push(normalisedURL);
        return true;
    }

    /**
     * This method returns the length of crawler queue
     * @return {number}
     */
    getQueueLength() {
        return this.#queue.length;
    }

    /**
     * This method returns the count of unique URL's crawled
     * by the crawler.
     *
     * @return {number}
     */
    getUniqueUrlsCount() {
        return this.#uniqueUrls.length;
    }

    /**
     * @return {number}
     */
    getFailedUrlsCount() {
        return Object.keys(this.#failedUrlsToNumOfRetries).length;
    }

    /**
     * Given HTML selector and its attribute returns array of all the attributes of
     * the selector.
     *
     * @param {string} selector - HTML tag ex. img, h1 div etc.
     * @param {string} attribute - HTML element attribute name ex. src, href etc.
     * @param {string} html - string representation of DOM
     *
     * @return {Array.<string>} - Attributes of all the 'selector'
     */
    static getAttributesBySelector( selector, attribute, html ) {
        return $(selector, html).map(function() {
                  return $(this).attr(attribute);
               }).get();
    }
}

module.exports = Crawler;