var request = require('request');
var cheerio = require('cheerio');

// Set the headers
console.log('Setting headers');
var headers = {
    'User-Agent': 'Wild/0.0.1',
    'Content-Type': 'application/json; charset=utf-8'
};

// Configure the request
console.log('Iniitalising request options');
var options = {
    url: 'https://play.google.com/store/getreviews',
    method: 'POST',
    headers: headers,
    form: {
        'reviewType': 0,
        'pageNum': 1,
        'id': 'com.prineside.tdi',
        'reviewSortOrder': 2,
        'xhr': 1,
        'hl': 'en_GB'
    }
};

// Start the request
console.log('Starting the request');
request(options, function(error, response, body) {
    console.log('Status Code:', response.statusCode);
    if (!error && response.statusCode == 200) {
        var htmlString = JSON.parse(body.slice(7, -1))[2];
        var reviews = [];
        $ = cheerio.load(htmlString);
        $('.single-review').each(function(i, elem) {
            reviews[i] = $(this).text();
        });
        console.log(reviews);
    }
})