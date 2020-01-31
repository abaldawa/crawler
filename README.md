# crawler
## Author: Abhijit Baldawa

## Dependencies
Node.js 13.7.0

## How to run
1. git clone https://github.com/abaldawa/crawler.git
2. cd crawler
3. npm i
4. npm run start

Output file is in crawler root directory with name siteMap.json


## Note on speed
In crawler/src/site.json the user can configure concurrency limit and outputFile name. The default concurrency is 3 and outputFile name is "siteMap.json". The higher the concurrency limit the more the speed of the crawler (subject to bandwidth, network latency and website server capabilities) but based on my testing for cuvva.com the sweet spot for concurrency limit is 3 with minimal to no failed requests. 

With concurrency limit 3 the overall cuvva.com website is crawled in just over 1 minute.

## Note on saving results of webcrawler
It is a BAD IDEA to save intermediate web scrapping results in-memory before saving in disk because if the website is big then the process could go out of memory. The best approach is to save results in DB or external file for every scraped result so memory usage does not spike at all.

I am holding the intermediate results in-memory array before saving all the results in the json file in disk at the end just to save time for this exercise.

I have tested that for the current website, the memory consumption to hold all the results before saving it in JSON file is inside 260 MB (still high though but manageble). If a DB was used then memory usage wouldn't have spiked beyond 50/60 MB for the entirity of crawler process as I have maintained back pressure management using async generator in javascript along with concurrency to speed up the web crawler.


