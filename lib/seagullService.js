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

var _ = require('lodash');
var restify = require('restify');
var errors = require('restify-errors');

const { createLogger } = require('./log.js');
const log = createLogger('seagullService.js');

function createServer(serverConfig, crudHandler, userApiClient, gatekeeperClient) {
  log.info('Creating server[%s]', serverConfig.name);
  var app = restify.createServer(serverConfig);
  app.use(restify.plugins.queryParser());
  app.use(restify.plugins.bodyParser());

  var userApi = require('user-api-client');

  var checkToken = userApi.middleware.checkToken(userApiClient);
  var permissions = require('amoeba').permissions(gatekeeperClient);

  var requireCustodian = function (req, res, next) {
    return permissions.requireCustodian(req, res, next);
  };
  var requireServer = function (req, res, next) {
    return permissions.requireServer(req, res, next);
  };
  var requireMembership = function (req, res, next) {
    return permissions.requireMembership(req, res, next);
  };

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     tidepoolUserAuth:
 *       type: apiKey
 *       in: header
 *       name: x-tidepool-session-token
 *     tidepoolServerAuth:
 *       type: apiKey
 *       in: header
 *       name: x-tidepool-session-token
 *   responses:
 *     InternalError:
 *       description: An internal problem occured
 *       content:
 *         text/plain:
 *           schema:
 *             type: string
 *     PageNotFound:
 *       description: The requested document is not found
 *       content:
 *         text/plain:
 *           schema:
 *             type: string
 *     Unauthorized:
 *       description: The requester is not authorized to perform this request
 *       content:
 *         text/plain:
 *           schema:
 *             type: string
 *     BadRequest:
 *       description: The request is not correct
 *       content:
 *         text/plain:
 *           schema:
 *             type: string
 *     NotImplemented:
 *       description: The method is not implemented
 *       content:
 *         text/plain:
 *           schema:
 *             type: string
 *   schemas:
 *     UpDeps:
 *       description: list of dependencies that are up
 *       type: array
 *       items:
 *         type: string
 *       example: ["mongo"]
 *     DownDeps:
 *       description: list of dependencies that are down
 *       type: array
 *       items:
 *         type: string
 *       example: ["mongo"]
 *     User:
 *       description: user information with basic information, permissions and profile
 *       type: object
 *     ServiceStatus:
 *       type: object
 *       properties:
 *         up:
 *           $ref: '#/components/schemas/UpDeps'
 *         down:
 *           $ref: '#/components/schemas/DownDeps'
 *         version:
 *           type: string
 *       example:
 *         up: ["mongo"]
 *         down: []
 *         version: 1.4.6
 *     CollectionDetails:
 *       description: The information that compose a collection
 *       type: object
 *       example:
 *         fullName: Name
 *         patient:
 *           birthday: 1990-01-01
 *           diagnosisDate: 2000-01-01
 *           diagnosisType: type1
 *     PrivateMetadata:
 *       description: metadata that is part of the "private" collection
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         id:
 *           type: string
 *         hash:
 *           type: string
 */

  var seagullApi = require('./routes/seagullApi')(crudHandler, userApiClient, gatekeeperClient, serverConfig);

/**
 * @swagger
 * /status:
 *  get:
 *    summary: Request Service Status
 *    description: This route returns 200 with software version and list of up/down dependencies
 *    responses:
 *      200:
 *        description: Service Status with software version and list of up/down dependencies
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ServiceStatus'
 */
  app.get('/status', seagullApi.status);

/**
 * @swagger
 * /users/{userid}/users:
 *  get:
 *    summary: List of users in a "share data" relationship with one subject
 *    security:
 *      - tidepoolUserAuth: []
 *    parameters:
 *       - in: path
 *         name: userid
 *         description: ID of the user subject
 *         required: true
 *         schema:
 *           type: string
 *    responses:
 *      200:
 *        description: List of users sharing data with one subject and users the subject is sharing data with
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                $ref: '#/components/schemas/User'
 *      400:
 *        $ref: '#/components/responses/BadRequest'
 *      401:
 *        $ref: '#/components/responses/Unauthorized'
 *      500:
 *        $ref: '#/components/responses/InternalError'
 */
  app.get('/users/:userid/users', checkToken, requireCustodian, seagullApi.users);

/**
 * @swagger
 * /collections:
 *  get:
 *    summary: Get an example of collections that can be used by these APIs
 *    description: |
 *      This route simply returns 200 with a list of collections.  
 *      Looks pretty useless as this list is static and APIs can ingest any named collection.  
 *      Currently returns [ 'profile', 'groups', 'private' ]
 *    responses:
 *      200:
 *        description: List of existing collections
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                type: string
 */
  app.get('/collections', seagullApi.metacollections);

  var notImplemented = function (req, res, next) {
    return next(new errors.NotFoundError());
  };

/**
 * @swagger
 * /{userid}/private:
  *  get:
 *    summary: Not implemented
 *    description: Not implemented
 *    parameters:
 *       - in: path
 *         name: userid
 *         description: ID of the user subject
 *         required: true
 *         schema:
 *           type: string
 *    responses:
 *      404:
 *        $ref: '#/components/responses/PageNotFound'
 *  post:
 *    summary: Not implemented
 *    description: Not implemented
 *    parameters:
 *       - in: path
 *         name: userid
 *         description: ID of the user subject
 *         required: true
 *         schema:
 *           type: string
 *    responses:
 *      404:
 *        $ref: '#/components/responses/PageNotFound'
 *  put:
 *    summary: Not implemented
 *    description: Not implemented
 *    parameters:
 *       - in: path
 *         name: userid
 *         description: ID of the user subject
 *         required: true
 *         schema:
 *           type: string
 *    responses:
 *      404:
 *        $ref: '#/components/responses/PageNotFound'
 *  delete:
 *    summary: Not implemented
 *    description: Not implemented
 *    parameters:
 *       - in: path
 *         name: userid
 *         description: ID of the user subject
 *         required: true
 *         schema:
 *           type: string
 *    responses:
 *      404:
 *        $ref: '#/components/responses/PageNotFound'
 */
  app.get('/:userid/private', notImplemented);
  app.post('/:userid/private', notImplemented);
  app.put('/:userid/private', notImplemented);
  app.del('/:userid/private', notImplemented);

/**
 * @swagger
 * /{userid}/private/{name}:
 *  get:
 *    summary: Get the named "private" metadata
 *    description: |
 *      Get the named "private" metadata.  
 *      Can create it if not existing.
 *    security:
 *      - tidepoolServerAuth: []
 *    parameters:
 *       - in: path
 *         name: userid
 *         description: ID of the user subject
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: name
 *         description: Name of the private metadata
 *         required: true
 *         schema:
 *           type: string
 *    responses:
 *      200:
 *        description: List of matching private metadata
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/PrivateMetadata'
 *      400:
 *        $ref: '#/components/responses/BadRequest'
 *      401:
 *        $ref: '#/components/responses/Unauthorized'
 *      404:
 *        $ref: '#/components/responses/PageNotFound'
 *  delete:
 *    summary: Delete the private metadata information (not implemented)
 *    description: Delete the private metadata information (not implemented)
 *    security:
 *      - tidepoolServerAuth: []
 *    parameters:
 *       - in: path
 *         name: userid
 *         description: ID of the user subject
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: name
 *         description: Name
 *         required: true
 *         schema:
 *           type: string
 *    responses:
 *      501:
 *        $ref: '#/components/responses/NotImplemented'
 */
app.get('/:userid/private/:name', checkToken, requireServer, seagullApi.metaprivate_read);
app.del('/:userid/private/:name', checkToken, requireServer, seagullApi.metaprivate_delete);

/**
 * @swagger
 * /{userid}/{collection}:
 *  get:
 *    summary: Get the entire collection content
 *    description: Get the entire collection content
 *    security:
 *      - tidepoolUserAuth: []
 *    parameters:
 *       - in: path
 *         name: userid
 *         description: ID of the user subject
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: collection
 *         description: Name of the collection (can be anything but "private" e.g. "profile", "groups", "preferences"...)
 *         required: true
 *         schema:
 *           type: string
 *    responses:
 *      200:
 *        description: Collection content at the top level
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/CollectionDetails'
 *      400:
 *        $ref: '#/components/responses/BadRequest'
 *      401:
 *        $ref: '#/components/responses/Unauthorized'
 *      404:
 *        $ref: '#/components/responses/PageNotFound'
 *      500:
 *        $ref: '#/components/responses/InternalError'
 *  post:
 *    summary: Update the collection
 *    description: |
 *      Update the collection.  
 *      Can create new collection if not existing.  
 *      Can create new field if not existing.  
 *      Returns the updated collection.
 *    security:
 *      - tidepoolUserAuth: []
 *    parameters:
 *       - in: path
 *         name: userid
 *         description: ID of the user subject
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: collection
 *         description: Name of the collection (can be anything but "private" e.g. "profile", "groups", "preferences"...)
 *         required: true
 *         schema:
 *           type: string
 *    requestBody:
 *      description: Collection information to be updated
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/CollectionDetails'
 *    responses:
 *      200:
 *        description: Success returning updated collection
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/CollectionDetails'
 *      400:
 *        $ref: '#/components/responses/BadRequest'
 *      401:
 *        $ref: '#/components/responses/Unauthorized'
 *      404:
 *        $ref: '#/components/responses/PageNotFound'
 *  put:
 *    summary: Update the collection
 *    description: |
 *      Update the collection.  
 *      Can create new collection if not existing.  
 *      Can create new field if not existing.  
 *      Returns the updated collection.
 *    security:
 *      - tidepoolUserAuth: []
 *    parameters:
 *       - in: path
 *         name: userid
 *         description: ID of the user subject
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: collection
 *         description: Name of the collection (can be anything but "private" e.g. "profile", "groups", "preferences"...)
 *         required: true
 *         schema:
 *           type: string
 *    requestBody:
 *      description: Collection information to be updated
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/CollectionDetails'
 *    responses:
 *      200:
 *        description: Success returning updated collection
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/CollectionDetails'
 *      400:
 *        $ref: '#/components/responses/BadRequest'
 *      401:
 *        $ref: '#/components/responses/Unauthorized'
 *      404:
 *        $ref: '#/components/responses/PageNotFound'
 *  delete:
 *    summary: Delete the collection (not implemented)
 *    description: Delete the collection (not implemented)
 *    security:
 *      - tidepoolUserAuth: []
 *    parameters:
 *       - in: path
 *         name: userid
 *         description: ID of the user subject
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: collection
 *         description: Name of the collection (can be anything but "private" e.g. "profile", "groups", "preferences"...)
 *         required: true
 *         schema:
 *           type: string
 *    responses:
 *      501:
 *        $ref: '#/components/responses/NotImplemented'
 */
  app.get('/:userid/:collection', checkToken, requireMembership, seagullApi.metacollection_read);
  app.post('/:userid/:collection', checkToken, requireCustodian, seagullApi.metacollection_update);
  app.put('/:userid/:collection', checkToken, requireCustodian, seagullApi.metacollection_update);
  app.del('/:userid/:collection', checkToken, requireCustodian, seagullApi.metacollection_delete);

  app.on('uncaughtException', function (req, res, route, err) {
    log.error(err, 'Uncaught exception on route[%s]!', route.spec ? route.spec.path : 'unknown');
    res.send(500);
  });

  app.on('close', function() {
    seagullApi.close();
    app.removeAllListeners();
  })
  return app;
}

module.exports = function seagullService(envConfig, crudHandler, userApiClient, gatekeeperClient) {
  var server = null;
  var servicePort = null;

  //create the server depending on the type
  if (envConfig.httpPort != null) {
    servicePort = envConfig.httpPort;
    server = createServer(
      { name: 'SeagullHttp' , appVersion: envConfig.serviceVersion },
      crudHandler,
      userApiClient,
      gatekeeperClient
    );
  }

  if (envConfig.httpsPort != null) {
    servicePort = envConfig.httpsPort;
    server = createServer(
      _.extend({ name: 'SeagullHttps', appVersion: envConfig.serviceVersion },
        envConfig.httpsConfig),
      crudHandler,
      userApiClient,
      gatekeeperClient
    );
  }

  return {
    close: function () {
      log.info('Stopping the Seagull API server');
      server.close();
    },
    start: function (cb) {
      log.info('Start Seagull API server serving on port[%s]', servicePort);
      server.listen(servicePort, cb);
    }
  };
};
