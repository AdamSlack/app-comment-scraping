const tr = require('tor-request');
const cheerio = require('cheerio');
const fs = require('fs');
const db = new(require('../db/db'))('scraper');

var pageNum = 0;
var appID = 'com.kryptokit.jaxx';
var idNum = -1;
console.log('Fetching comments for:', appID);

// Set the headers
console.log('Setting headers');
var headers = {
    'user-agent': 'user-agent:Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded;',
    'alt-svc': 'quic=":443"; ma=2592000; v="39,38,37,35"',
};
var form = {
    'authuser': 0,
    'reviewType': 0,
    'pageNum': pageNum,
    'id': appID,
    'reviewSortOrder': 0,
    'xhr': 1,
    'hl': 'en_GB'
}


// Configure the request

console.log('Initalising request options');
var options = {
    url: 'https://play.google.com/store/getreviews',
    method: 'POST',
    headers: headers,
    form: form
};
var allreviews = [];

function logReviews(reviews) {
    fs.appendFileSync(appID + '.txt', JSON.stringify(reviews, undefined, 4));
}

async function fetchAppID() {
    const res = await db.selectAppID();
    appID = res.appID;
    idNum = res.idNum;
    console.log(res.appID);
    try {
        scrapeReviews();
    } catch (err) {
        scrapeReviews();
    }
}

fetchAppID();

function scrapeReviews() {


    tr.request('https://api.ipify.org', function(err, res, body) {
        if (!err && res.statusCode == 200) {
            console.log("Your public (through Tor) IP is: " + body);
        }
    });
    // Start the request
    console.log('Requesting comments for page:', form.pageNum);
    tr.request(options, function(error, response, body) {
        //console.log(body);
        if (!error && response.statusCode == 200) {
            console.log('Status Code:', response.statusCode);
            var htmlString = JSON.parse(body.slice(7, -1))[2];
            var reviews = [];
            $ = cheerio.load(htmlString);
            $('.single-review').each(function(i, elem) {
                reviews[i] = {
                    author: $(this).find('.author-name').text(),
                    date: $(this).find('.review-date').text(),
                    rating: $(this).find('.star-rating-non-editable-container').attr('aria-label'),
                    comment: $(this).find('.review-body').text().replace(/  (Full Review  +$)/, '')
                }
            });
            //console.log('Response:', response);
            if (reviews.length > 0) {
                //allReviews = allreviews.concat(reviews);
                logReviews(reviews);
                form.pageNum += 1;
                setTimeout(() => {
                    try {
                        scrapeReviews();
                    } catch (err) {
                        scrapeReviews();
                    }
                }, 2000);
            } else {
                db.setScrapedDate(idNum);
                fetchAppID();
            }
        }

        if (!error && response.statusCode == 302) {
            console.log('You\'re being blocked!', response.statusCode);
            console.log('Waiting until IP changes...');
            setTimeout(() => {
                try {
                    scrapeReviews();
                } catch (err) {
                    scrapeReviews();
                }
            }, 10000);
        }

        if (error) {
            console.log('Error, going to bail');
            throw error;
        }


    });

}