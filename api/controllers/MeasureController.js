/**
 * MeasureController
 *
 * @description :: Defines functionality for managing measures, users can initially go to a group
 * in the landing page (see the group/login view).  The users object is not defined, there is no
 * such thing as 'joining' a group. As long as the person knows the name of the group, they 
 * can see and edit scores. 
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
    update: function(req, res) { sails.log.debug(req);
        Measure.update({measureNumber: req.param('measureNumber'),owner: req.param('owner')},req.allParams()).exec(function(err, measure) {
            sails.log.debug(measure);
           sails.sockets.broadcast(req.param('owner').toString(), { verb: 'updated', measure: measure}); 
        });
    },
    destroy: function(req, res) { sails.log.debug(req);
        Measure.destroy(req.allParams()).exec(function(err) {
			Measure.find( { measureNumber: { '>': req.param('measureNumber') }, owner: req.param('owner') } ).exec(function(err, above) {
				sails.log.debug(above);
				var meas;
				for(var m = 0; m < above.length; m++) {
					meas = above[m];
					sails.log.debug(meas);
					Measure.update(meas, {measureNumber: meas.measureNumber-1}).exec(function(err, rec) {
						if(err) {
							sails.log.debug(err);
						}
					});
				}
			});
            if(err) {
                sails.log.debug(err);
            }
           sails.sockets.broadcast(req.param('owner').toString(), { verb: 'destroyed', measureNumber: req.param('measureNumber') }); 
        });
    },
    create: function(req, res) { sails.log.debug(req);
        Measure.create(req.allParams()).exec(function(err, measure) {
           sails.sockets.broadcast(req.param('owner').toString(), { verb: 'created', measure: measure }); 
        });
    },
    upload: function(req, res) {
        var http = require('http');
            var endpoint = 'www.youtubeinmp3.com/fetch/?format=text&video=' + decodeURIComponent(req.param('url'));
            http.get(endpoint, function(response) {
                var data;
                response.on('data', function(chunk) {
                    data += chunk;
                });
                response.on('end', function() {
                    console.log(data);
                    res.json(data);
                    
                });
            });
    }
};