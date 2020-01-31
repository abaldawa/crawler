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

    constructor({baseUrl, concurrency}) {
        this.#baseUrl = baseUrl;
        this.#concurrency = concurrency;
    }

    /**
     * Returns the number of URL's from the queue based on concurrency
     * set by the user.
     *
     * @return {string[]} - Array of URL's to crawl parallelly
     */
    getUrls() {
        return new Array(this.#concurrency)
                .fill(true)
                .map(()=>this.#queue.shift())
                .filter(Boolean);
    }

    /**
     * This async generator function yields the results of a crawled html page and can be used with for await of loop
     * This method respects the concurrency passed to it in the constructor and scrapes those requests concurrently.
     *
     * @return {AsyncGenerator<{html: string, currentUrl: string, queueLength: number, counter: number}, void, ?>}
     */
    async *crawl() {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        let counter = 0;

        while( this.#queue.length ) {
            const urlsToCrawl = this.getUrls();
            const promisesArr = urlsToCrawl.map( async currentUrl => {
                                    try{
                                        counter++;
                                        await page.goto(currentUrl);
                                        const html = await page.content();
                                        return {html, currentUrl, counter, queueLength: this.#queue.length};
                                    } catch(e) {
                                        console.warn(`Error fetching content from URL: ${currentUrl}. Error: ${e}`);
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
     * @return boolean - true if successful else false
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
     * This method returns a copy of crawler queue
     * @return {Array.<string>}
     */
    getQueue() {
        return [...this.#queue];
    }

    /**
     * This method returns clone of unique URL's collected
     * by the crawler.
     *
     * @return {Array.<string>}
     */
    getUniqueUrls() {
        return [...this.#uniqueUrls];
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