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
        var async = require('async');
        async.parallel([
            
        function(callback) {
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
                        callback(false, obj);
                    });
            });
        });
        },
        function(callback) {
        var key = 'niFGLBU4PnGmV3T5KZsLASysX4Egd2Ad';
        var term = req.param('title');
        var endpoint = 'http://api.musescore.com/services/rest/score.json?oauth_consumer_key=' + key + '&text='+ term + '&part=0';
        http.get(endpoint, function(response){
            var data = '';
            response.on('data', function(chunk) {
                data += chunk;
            });
            response.on('end', function() {
                var songlinks2 = [];
                var songtitles2 = [];
                var loop = JSON.parse(data);
                var ret = {};
                for(var i in loop) {
                    songtitles2.push(loop[i].title);
                    songlinks2.push('http://static.musescore.com/' + loop[i].id + '/' + loop[i].secret +  '/score.mxl');
                }
                ret.links2 = songlinks2;
                ret.titles2 = songtitles2;
                callback(false, ret);
                
            });
        });
        }], function(err, results) {
            res.json({rudy: results[0], muse: results[1]});
        });

    },
    'selectFromApi' : function(req, res) {
        var http = require('http');
        var jsdom = require('node-jsdom');
        
        
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
        var http = require('http');
        var AdmZip = require('adm-zip');
        var term = req.param('link');
        var fs = require('fs');
        var uuid = require('uuid');
        const exec = require('child_process').exec;
        http.get(term, function(response){
            var data = [], dataLen = 0;
            response.on('data', function(chunk) {
                data.push(chunk);
                dataLen += chunk.length;
            });
            response.on('end', function() {
                var buf = new Buffer(dataLen);
                
                for (var i=0, len = data.length, pos = 0; i < len; i++) {
                    data[i].copy(buf, pos);
                    pos += data[i].length;
                }
                
                var zip = new AdmZip(buf);
                var zipEntries =  zip.getEntries();
               // console.log(zipEntries.length);
                var xml = "";
                for(var j = 0; j < zipEntries.length; j++) {
                    xml += zip.readAsText(zipEntries[j]);
                }     
                var path = sails.config.appPath + '/.tmp/private/downloads/' + uuid() + '.xml';
                var stream = fs.createWriteStream(path);
                var lines = xml.split('\n');
                if (lines[1]==='<container>') {
                    lines.splice(0,9);
                    xml = lines.join('\n');
                }
                stream.write(xml);
                exec('python /home/ubuntu/workspace/Polytone/xml2abc.py -b 5 ' + path, function(err, stdout, stderr) {
                    res.send(stdout);
                    console.log(stderr);
            });
            });
        });
    },
    'upload': function(req, res) { 
        var fs = require('fs');
        const exec = require('child_process').exec;
        var uuid = require('uuid');
        
        req.file('myfile').upload({saveAs:uuid()+'.mp3',dirname: require('path').resolve(sails.config.appPath, '.tmp/public/uploads')},function (err, uploadedFiles){ 
            if(err) { sails.log.debug(err);}
            console.log(uploadedFiles[0]);
            var mp3 = uploadedFiles[0].fd;
            var wav = mp3.slice(0,-3) + 'wav';
            var mid = mp3.slice(0,-3) + 'mid';
           
             exec('lame --decode ' + mp3 + ' ' + wav, function(err, stdout, stderr) {
                 if(err||stderr) {console.log(err);console.log(stderr);}
                 exec('./waon -i ' + wav + ' -o ' + mid, function(err, stdout, stderr) {
                     if(err||stderr) {console.log(err);console.log(stderr);}
                     exec('midi2abc ' + mid, function(err, stdout, stderr) {
                         if(err||stderr) {console.log(err);console.log(stderr);}
                         res.json(stdout.split('\n').join('\n'));
                     });
                 });
             });
        });

        
    },
    'getYoutube': function(req, res) {
        //www.youtubeinmp3.com/fetch/?format=text&video=https://www.youtube.com/watch?v=i62Zjga8JOM
        var http = require('http');
        var endpoint = 'www.youtubeinmp3.com/fetch/?format=text&video=' + decodeURIComponent(req.param('url'));
        http.get(endpoint, function(response) {
            var data = {};
            response.on('data', function(chunk) {
                data += chunk;
            })
            response.on('end', function() {
                console.log(data);
            });
            
            
        });
        // use youtube to mp3 api to download mp3, turn in wav, midi, abc, send back and display in abcTune2
        
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