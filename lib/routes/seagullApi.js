/*
 == BSD2 LICENSE ==
 Copyright (c) 2014, Tidepool Project

 This program is free software; you can redistribute it and/or modify it under
 the terms of the associated License, which is identical to the BSD 2-Clause
 License as published by the Open Source Initiative at opensource.org.

 This program is distributed in the hope that it will be useful, but WITHOUT
 ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 FOR A PARTICULAR PURPOSE. See the License for more details.

 You should have received a copy of the License along with this program; if
 not, you can obtain one from Tidepool Project at tidepool.org.
 == BSD2 LICENSE ==
 */

'use strict';

const util = require('util');

const _ = require('lodash');
const async = require('async');
const { createLogger } = require('../log.js');
const log = createLogger('seagullApi.js');

/*
 Http interface for group-api
 */
module.exports = function (crudHandler, userApiClient, teamsClient, serverConfig) {

  /*
   HELPERS
   */

  function createDocAndCallback(userId, res, next, cb) {
    crudHandler.createDoc(userId, {}, function (err, result) {
      if (err) {
        log.error(err, 'createDocAndCallback: Error creating metadata doc');
        if (err.statusCode == 400) {
	  /* return a 500 code to indicate a temporary server error.  Expect a retry. */
          res.send(500);
        } else {
          res.send(err.statusCode);
        }
        return next();
      } else {
        cb();
      }
    });
  }

  function getCollection(req, res, sanitize, next) {
    crudHandler.getDoc(_.get(req, 'params.userid'), function (err, result) {
      if (err) {
        log.error(err, 'getCollection: Error reading metadata doc');
        res.send(err.statusCode);
      } else {
        var collection = _.get(req, 'params.collection');
        var retVal = result.detail[collection];
        if (retVal == null) {
          res.send(404);
        } else {
          if (collection === 'profile' && sanitize) {
            res.send(200, sanitizeProfile(retVal));
          } else {
            res.send(200, retVal);
          }
        }
      }
      return next();
    });
  }

  var ANY = ['any'];
  var NONE = ['none'];
  var TRUES = ['true', 'yes', 'y', '1'];

  function parsePermissions(permissions) {
    permissions = _.trim(permissions);
    if (permissions !== '') {
      permissions = _.compact(_.map(permissions.split(','), _.trim));
      if (_.isEqual(permissions, ANY)) {
        return ANY;
      } else if (_.isEqual(permissions, NONE)) {
        return NONE;
      } else if (!_.isEmpty(permissions)) {
        return permissions;
      }
    }
    return null;
  }

  function arePermissionsValid(permissions) {
    if (permissions.length > 1) {
      if (!_.isEmpty(_.intersection(_.union(ANY, NONE), permissions))) {
        return false;
      }
    }
    return true;
  }

  function arePermissionsSatisfied(queryPermissions, userPermissions) {
    if (queryPermissions === ANY) {
      return !_.isEmpty(userPermissions);
    } else if (queryPermissions === NONE) {
      return _.isEmpty(userPermissions);
    } else {
      return _.every(queryPermissions, _.partial(_.has, userPermissions));
    }
  }

  function stringToBoolean(value) {
    return _.includes(TRUES, _.trim(value).toLowerCase());
  }


  function userMatchesQueryOnPermissions(user, query) {
    if (query) {
      if (_.has(query, 'trustorPermissions') && !arePermissionsSatisfied(query.trustorPermissions, user.trustorPermissions)) {
        return false;
      }
      if (_.has(query, 'trusteePermissions') && !arePermissionsSatisfied(query.trusteePermissions, user.trusteePermissions)) {
        return false;
      }
    }
    return true;
  }

  function userMatchesQueryOnUser(user, query) {
    if (query) {
      if (_.has(query, 'email') && !query.email.test(user.username)) {
        return false;
      }
      if (_.has(query, 'emailVerified') && query.emailVerified != stringToBoolean(user.emailVerified)) {
        return false;
      }
      if (_.has(query, 'termsAccepted') && !query.termsAccepted.test(user.termsAccepted)) {
        return false;
      }
    }
    return true;
  }

  function userMatchesQueryOnProfile(user, query) {
    if (query) {
      if (_.has(query, 'name') && !query.name.test(_.result(user, 'profile.fullName'))) {
        return false;
      }
      if (_.has(query, 'birthday') && !query.birthday.test(_.result(user, 'profile.patient.birthday'))) {
        return false;
      }
      if (_.has(query, 'diagnosisDate') && !query.diagnosisDate.test(_.result(user, 'profile.patient.diagnosisDate'))) {
        return false;
      }
    }
    return true;
  }

  function userMatchingQuery(user, query) {
    if (query) {
      if (!userMatchesQueryOnPermissions(user, query) ||
          !userMatchesQueryOnUser(user, query) ||
          !userMatchesQueryOnProfile(user, query)) {
        return null;
      }
    }
    return user;
  }

  function sanitizeUser(user) {
    return _.omit(user, 'passwordExists');
  }

  function sanitizeProfile(profile) {
    return _.pick(profile, 'fullName');
  }

  return {
    /** HEALTH CHECK **/
    status: function (req, res, next) {
      log.trace('status: params[%j], url[%s], method[%s]', req.query, req.url, req.method);

      if (req.query.status) {
        res.send(200, {status: req.query.status});
      } else {
        crudHandler.status(function (error, result) {
          log.trace('returning status ' + result.statusCode);
          result.deps.version = serverConfig.appVersion
          res.send(result.statusCode, result.deps);
        });
      }
      return next();
    },

    /*
     IMPLEMENTATIONS OF METHODS
     */

    users: async function(req, res, next) {
      log.trace(`GET /users/${req.params.userid}/users`);
      var targetUserId = _.trim(req.params.userid);
      if (targetUserId === '') {
        log.error('Target user id not specified');
        res.send(400, 'Target user id not specified');
        return next(false);
      }
      const userToken  = req.headers["x-tidepool-session-token"];
      let teams;
      try {
        teams = await teamsClient.getTeams(userToken);
      }
      catch (err) {
        log.error('Error on get teams api call:', err);
        res.send(err.status, err.messages);
        return next(false);
      }
      const allUsers = _.flatMap(teams , (t) => {
        let members = [];
        let patients = [];
        if(Array.isArray(t.members)) {
          members = t.members
        }
        if(Array.isArray(t.patients)) {
          patients = t.patients
        }
        return members.concat(patients);
      });
      let userIds = _.flatMap(allUsers, el => {
          if(el.invitationStatus == 'accepted') {
            return [el.userId]
          }
          return []
      });
      userIds = _.uniq(userIds);
      crudHandler.getDocs(userIds, function (err, mongoResult) {
        if (err) {
          log.error(err, 'Error getting document for user ids', userIds);
          res.send(err.statusCode, err.message);
          return next(false);
        }
        const userMetadata = mongoResult.detail;
        const users = _.map(allUsers, u=>{
            if(u) {
              const out = {}
              out.userid = u.userId;
              out.teamid = u.teamId;
              out.invitationStatus = u.invitationStatus;
              out.role = u.role;
              if(userMetadata[u.userId]) {
                if(userMetadata[u.userId].profile) {
                  out.profile = {
                    firstName: userMetadata[u.userId].profile.firstName,
                    lastName: userMetadata[u.userId].profile.lastName,
                    fullName: userMetadata[u.userId].profile.fullName
                  }
                }
                if(userMetadata[u.userId].settings) {
                  out.settings = {
                    units : userMetadata[u.userId].settings.units,
                    country: userMetadata[u.userId].settings.country
                  }
                }
              }
              return out;
            }
        });
        res.send(200, users);
        return next();
      });
    },

    metacollections: function (req, res, next) {
      log.debug('metacollections: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

      res.send(200, [ 'profile', 'groups', 'private' ]);
      return next();
    },

    metacollection_read: function (req, res, next) {
      log.debug('metacollection_read: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

      var collection = req.params.collection;
      if (collection == null) {
        res.send(400, 'No collection specified');
        return next();
      }

      if (req._tokendata.isserver) {
        var sanitize = false;
        return getCollection(req, res, sanitize, next);
      }
      var sanitize = _.get(req,'_tokendata.userid')!==_.get(req, 'params.userid');
      return getCollection(req, res, sanitize, next);
    },

    metacollection_update: function (req, res, next) {

      var collection = req.params.collection;
      if (collection == null) {
        res.send(400, 'No collection specified');
        return next();
      }

      var updates = req.body;
      if (updates == null) {
        res.send(400, 'Must have a body');
        return next();
      }

      updates = _.reduce(updates, function (accum, update, key) {
        accum[util.format('%s.%s', collection, key)] = update;
        return accum;
      }, {});

      function doUpdate(addIfNotThere) {
        var userId = req.params.userid;
        crudHandler.partialUpdate(userId, updates, function (err, result) {
          if (err) {
            if (err.statusCode == 404 && addIfNotThere) {
              return createDocAndCallback(userId, res, next, function () { doUpdate(false); });
            } else {
              log.error(err, 'Error updating metadata doc');
              res.send(err.statusCode);
              return next();
            }
          } else {
            res.send(200, result.detail[collection]);
            return next();
          }
        });
      }

      doUpdate(true);
    },

    metacollection_delete: function (req, res, next) {
      log.debug('metacollection_delete: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

      res.send(501); // not implemented
      return next();
    },

    metaprivate_read: function (req, res, next) {
      log.debug('metaprivate_read: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

      var userId = req.params.userid;

      var name = req.params.name;
      if (name == null) {
        res.send(400, 'No name specified');
        return next();
      }

      function getPrivatePair(addIfNotThere) {
        crudHandler.getDoc(userId, function (err, mongoResult) {
          if (err) {
            if (err.statusCode === 404 && addIfNotThere) {
              return createDocAndCallback(userId, res, next, function () { getPrivatePair(addIfNotThere); });
            }
            log.error(err, 'Error reading metadata doc');
            res.send(err.statusCode);
          } else {
            var result = mongoResult.detail;
            // we have the doc now, let's see if it has the name
            if (result.private && result.private[name]) {
              res.send(200, result.private[name]);
              return next();
            } else {
              if (addIfNotThere) {
                return makeNewHash();
              } else {
                res.send(404);
              }
            }
          }
          return next();
        });
      }

      function makeNewHash() {
        // generate a private pair
        // TODO: 20150627_darinkrauss This probably shouldn't be anon (including name)
        userApiClient.getAnonymousPair(function (err, pair) {
          if (err != null) {
            log.info(err, 'Unable to generate a new anonymous pair!');
            res.send(500);
            return next();
          } else {
            var update = {};
            update['private.' + name] = pair;
            crudHandler.partialUpdate(userId, update, function (err, result) {
              if (err) {
                log.error(err, 'Error creating metadata doc');
                if (err.statusCode == 404) {
                  res.send(404);
                  return next();
                } else {
                  res.send(err.statusCode);
                  return next();
                }
              } else {
                res.send(200, result.detail.private[name]);
                return next();
              }
            });
          }
        });
      }

      getPrivatePair(true);
    },

    metaprivate_delete: function (req, res, next) {
      log.debug('metaprivate_delete: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

      res.send(501); // not implemented
      return next();
    },

    close: function () {
      crudHandler.closeDatabase();
    }
  };
};
