/**
 * User: abhijit.baldawa
 */

const fs = require('fs');
const path = require('path');

let results = [];
let resultFilePath;

/**
 * @param {string} outputFile
 */
function init(outputFile) {
    resultFilePath = path.join(__dirname, "..", outputFile);

    try {
        fs.unlinkSync(resultFilePath);
    } catch (err) {
        // Do not log error if file does not exist
        if( err.code !== "ENOENT" ) {
            console.log(`Error while deleting file at path: ${resultFilePath}. Error: ${err}`);
        }
    }
}

/**
 * NOTE: It is a BAD IDEA to save web scrapping results in-memory because
 * if the website is big then the process could go out of memory. The best approach
 * is to save results in DB or external file as you keep getting save calls.
 *
 * I am saving the results in-memory just to save time for this exercise and I have tested
 * that for the current website the memory consumption is inside 260 MB (still high though)
 *
 * @param {object} pageObject
 *   @param {string} pageObject.url
 *   @param {object} pageObject.dependencies
 *      @param {string[]} pageObject.dependencies.js
 *      @param {string[]} pageObject.dependencies.link
 *      @param {string[]} pageObject.dependencies.image
 */
function save(pageObject) {
    results.push(pageObject);
}

/**
 * Save file as a sitemap to disk
 */
function createJsonResult() {
    fs.writeFileSync(resultFilePath, JSON.stringify(results, null, 2));
}

/**
 * @return {number}
 */
function getStoreLength() {
    return results.length;
}

/**
 * @return {string} - Output file path
 */
function getOutputFilePath() {
    return resultFilePath;
}

module.exports = {
  init,
  save,
  createJsonResult,
  getStoreLength,
  getOutputFilePath
};