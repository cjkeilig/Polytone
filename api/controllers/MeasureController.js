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
        Measure.update(req.allParams()).exec(function(err, measure) {
           sails.sockets.broadcast(measure.owner, measure); 
        });
    },
    destroy: function(req, res) { sails.log.debug(req);
        Measure.destroy(req.allParams()).exec(function(err, measure) {
           sails.sockets.broadcast(measure.owner, measure); 
        });
    },
    create: function(req, res) { sails.log.debug(req);
        Measure.create(req.allParams()).exec(function(err, measure) {
           sails.log.debug(measure);
           sails.sockets.broadcast(measure.owner, measure); 
        });
    }
};