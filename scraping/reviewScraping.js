const tr = require('tor-request');
const cheerio = require('cheerio');
const fs = require('fs');
const db = new(require('../db/db'))('scraper');

var idNum = -1;

// Set the headers
console.log('Setting headers');
var headers = {
    'user-agent': 'user-agent:Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded;',
    'alt-svc': 'quic=":443"; ma=2592000; v="39,38,37,35"',
};

var allreviews = [];

function logReviews(reviews) {
    fs.appendFileSync(appID + '.txt', JSON.stringify(reviews, undefined, 4));
}

async function fetchAppID() {
    const res = await db.selectAppID();
    idNum = res.idNum;
    var form = {
        'authuser': 0,
        'reviewType': 0,
        'pageNum': 0,
        'id': res.appID.replace(/ /g, ''),
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

    console.log('Fetching comments for:', options.form.id);
    try {
        scrapeReviews(options);
    } catch (err) {
        scrapeReviews(options);
    }
}

function insertComments(appID, idNum, comments) {
    comments.forEach(async(comment) => {
        if (comment.author.replace(/ /g, '').lenth == 0) {
            comment.author = 'unknown';
        }
        await db.insertComment(appID, idNum, comment)
    });
}
fetchAppID();

function scrapeReviews(options) {


    tr.request('https://api.ipify.org', function(err, res, body) {
        if (!err && res.statusCode == 200) {
            console.log("Your public (through Tor) IP is: " + body);
        }
    });
    // Start the request
    console.log('Requesting comments for page:', options.form.pageNum);
    tr.request(options, function(error, response, body) {
        //console.log(body);

        if (!error && response.statusCode == 200) {
            console.log('Status Code:', response.statusCode, 'Parsing response');
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
                //logReviews(reviews);
                insertComments(options.form.id, idNum, reviews);
                options.form.pageNum += 1;
                setTimeout(() => {
                    try {
                        scrapeReviews(options);
                    } catch (err) {
                        scrapeReviews(options);
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
                    scrapeReviews(options);
                } catch (err) {
                    scrapeReviews(options);
                }
            }, 10000);
        }

        if (error) {
            console.log('Error, going to bail');
            throw error;
        }


    });

}