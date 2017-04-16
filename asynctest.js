var https = require('https');
var key = 'niFGLBU4PnGmV3T5KZsLASysX4Egd2Ad';
        var term = 'beethoven';
        var endpoint = 'https://api.musescore.com/services/rest/score.json?oauth_consumer_key=' + key + '&text='+ term + '&part=0';
        https.get(endpoint, function(response){
            
            console.log(response);
            var data = '';
            response.on('data', function(chunk) {
                data += chunk;
            });
            response.on('end', function() {
                console.log(data);
            });
        });