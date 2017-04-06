/**
 * ScoreController
 *
 * @description :: Defines functionality for managing scores, users can initially go to a group
 * in the landing page (see the group/login view).  The users object is not defined, there is no
 * such thing as 'joining' a group. As long as the person knows the name of the group, they 
 * can see and edit scores. 
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
module.exports = {
    
    'show' : function(req, res) {
		var obj;
		if(req.param('name')) {
			obj = {name:req.param('name')};
		}
		else {
			obj = {id:req.param('id')};
		}
		sails.log.debug(obj);
        Group.findOne(obj).populate('scores').exec(function(err, group) {
            if(err) {
                sails.log.debug(err);
            }
			sails.log.debug(group);
            if(!group.scores) {
                group.scores = ['none'];
            }
            res.view('score/show', {scores: group.scores, group:group});
        });
    },
    'create' : function(req, res) {
        Score.create(req.allParams()).exec(function(err, score) {
            if(err) {
                sails.log.debug(err);
            }
            res.redirect('/score/edit/'+ score.id);
        });
    },
    'edit': function(req, res) {
        sails.log.debug(req.allParams());
        Score.findOne(req.param('id')).populate('measures').exec(function(err, score) {
            res.view('score/edit', {
                score: score
            });
        });
    },
   'joinRoom': function (req, res) {
      // if request is not a socket request
  
      if (!req.isSocket) {
        return res.badRequest();
        sails.log.debug("BAD request");
      }
      // the room name is just the score id, which is unique
      var roomName = req.param('id').toString();
      sails.sockets.join(req, roomName, function(err) {
        if (err) {
          return res.serverError(err);
        }
        
        return res.json({
          message: 'Subscribed to a fun room called '+roomName+'!'
        });
      });
    },
    'search': function(req, res) {
      
        var http = require('http');
 
        // make a cache and return what is in cache first 
        var jsdom = require('node-jsdom');
        // implement async
        
        // make sure title is more than 4 letters
        http.get({
            host: 'rudy-rucker.mit.edu',
            path: '/~jc/cgi/abc/tunefind?P=' + req.param('title') + '&find=FIND&m=title&W=wide&scale=1&limit=1000&thresh=5&fmt=single&V=1&Tsel=tune&Nsel=0'
        }, function(response) {
            // Continuously update stream with data
            var body = '';
            response.on('data', function(d) {
                body += d;
            });
            response.on('end', function() {

                // Data reception is done, do whatever with it!
                // Scrape the html

                jsdom.env(
                    body,
                    ["http://code.jquery.com/jquery.js"],
                    function (errors, window) {
                        var obj = {};
                        var links = [];
                        var titles = [];
                        window.$("form td:nth-child(5) a").each(function(){ links.push('http://rudy-rucker.mit.edu' + window.$(this).attr('href')) });
                        obj.links = links;
                        window.$("form td:nth-child(18)").each(function(){ titles.push(window.$(this).text()) });
                        obj.titles = titles;
                        res.json(obj);
                    });
            });
        });

    },
    'selectFromApi' : function(req, res) {
        var http = require('http');
        var jsdom = require('node-jsdom');
        //sails.log.debug(decodeURIComponent(req.param('selected')));
        http.get(req.param('selected'), function(response) {
            var body = '';
            response.on('data', function(d) {
                body += d;
            });
            response.on('end', function() {
                
                jsdom.env(
                    body,
                    ["http://code.jquery.com/jquery.js"],
                    function (errors, window) {
                        var obj = {};
                        
                        var abc = window.$("pre").text();
                        sails.log.debug(abc);
                        obj.abc = abc;
                        res.json(obj);
                    });
            });

        });
    },
    'museScore' : function (req, res) {
      /*  Score Files URLs

      You can construct the source URL to score files once you know its ID and its secret, as returned by many API methods.

      The URL takes the following format: http://static.musescore.com/{id}/{secret}/score.{extension}
      Where extension can be anything in pdf, mid (General MIDI), mxl (Compressed MusicXML), mscz (MuseScore file), mp3.
      */
    },
    'convertMidi': function(req, res) {
        var fs = require('fs');
        var uuid = require('uuid');
        var uid = uuid();
        req.file('myFile.mid').upload({saveAs:uid+'.mid',dirname: require('path').resolve(sails.config.appPath, '.tmp/public/uploads')},function (err, uploadedFiles){
          if (err) return res.send(500, err);
            sails.log.debug(uploadedFiles);
            var wav = uploadedFiles[0].fd.slice(0,-3) + 'wav';
            var mp3 = uploadedFiles[0].fd.slice(0,-3) + 'mp3';
            const exec = require('child_process').exec;
            
            var toWAV = 'timidity ' + uploadedFiles[0].fd + ' -Ow -o ' + wav;
            var toMP3 = 'lame -V2 ' + wav + ' ' + mp3;
            exec(toWAV, function(err, stdout, stderr) {
                if(err) {
                  sails.log.debug(err);
                }
               
                sails.log.debug(stdout);
                sails.log.debug(stderr);
                
                exec(toMP3, function(err, stdout, stderr) {
                    if(err) {
                        sails.log.debug(err);
                    }
                    sails.log.debug(stdout);
                    sails.log.debug(stderr);
                    fs.unlink(wav);
                    
                    var FormData = require('form-data');
                    var form = new FormData();
                    sails.log.debug(mp3);
                    form.append('input_file', fs.createReadStream(mp3));
                    form.append('access_id','7949e018-3d19-48fb-8439-c465b93af99e');
                    form.append('format','json');
                    form.append('begin_seconds','');
                    form.append('end_seconds','');
                    sails.log.debug(form);
                    form.submit('https://api.sonicapi.com/analyze/chords',function(err,submit) {
                        if(err) {sails.log.debug(err)};
                        var data;
                        submit.on('data', function(chunk) {
                            sails.log.debug(chunk);
                            data += chunk;
                            
                        });
                        submit.on('end', function() {
                            res.json(data);
                        });
                        
                        
                    });
                    
                   
                   
                });
            });
        });
    }
};