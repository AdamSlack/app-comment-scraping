var tr = require('tor-request');
var cheerio = require('cheerio');
var fs = require('fs');



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
    'pageNum': 0,
    'id': 'com.rovio.angrybirds',
    'reviewSortOrder': 0,
    'xhr': 1,
    'hl': 'en_GB'
}

// Configure the request

console.log('In iitalising request options');
var options = {
    url: 'https://play.google.com/store/getreviews',
    method: 'POST',
    headers: headers,
    form: form
};
var allreviews = [];

function logReviews(reviews) {
    fs.appendFileSync('reviews.txt', JSON.stringify(reviews, undefined, 4));
}

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
        console.log('Status Code:', response.statusCode);
        if (!error && response.statusCode == 200) {
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
                }, 1000);
            }
        }

        if (!error && response.statusCode == 302) {
            console.log('You\'re being blocked!', response.statusCode);
        }
    });

}

form.pageNum = 0;
try {
    scrapeReviews();
} catch (err) {
    scrapeReviews();
}