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
 *       example: ["mongo"]
 *     DownDeps:
 *       description: list of dependencies that are down
 *       type: array
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
 *     Metadata:
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
 *    description: |
 *      This route returns 200 with software version and list of up/down dependencies
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
 *        description: Bad request
 *        schema:
 *          $ref: '#/components/responses/BadRequest'
 *      401:
 *        description: Unauthorized
 *        schema:
 *          $ref: '#/components/responses/Unauthorized'
 *      500:
 *        description: Internal Error happened
 *        schema:
 *          $ref: '#/components/responses/InternalError'
 */
  app.get('/users/:userid/users', checkToken, requireCustodian, seagullApi.users);

/**
 * @swagger
 * /collections:
 *  get:
 *    summary: Get a list of valid collections
 *    description: |
 *      This route simply returns 200 with list of possible collections to be used with this API
 *      Note that 'private' collection is not implemented
 *      [ 'profile', 'groups', 'private' ]
 *    responses:
 *      200:
 *        description: List of existing collections
 *        content:
 *          application/json:
 *            schema:
 *              type: array
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
 *        description: Not Found
 *        schema:
 *          $ref: '#/components/responses/PageNotFound'
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
 *        description: Not Found
 *        schema:
 *          $ref: '#/components/responses/PageNotFound'
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
 *        description: Not Found
 *        schema:
 *          $ref: '#/components/responses/PageNotFound'
 *  del:
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
 *        description: Not Found
 *        schema:
 *          $ref: '#/components/responses/PageNotFound'
 */
  app.get('/:userid/private', notImplemented);
  app.post('/:userid/private', notImplemented);
  app.put('/:userid/private', notImplemented);
  app.del('/:userid/private', notImplemented);

/**
 * @swagger
 * /{userid}/private/{name}:
 *  get:
 *    summary: Get the "private" collection information named <name>
 *    description: Get the "private" collection information named <name>. Can create it if not existing
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
 *      200:
 *        description: List of matching private metadata
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Metadata'
 *      400:
 *        description: Bad Request
 *        schema:
 *          $ref: '#/components/responses/BadRequest'
 *      401:
 *        description: Unauthorized
 *        schema:
 *          $ref: '#/components/responses/Unauthorized'
 *      404:
 *        description: Not Found
 *        schema:
 *          $ref: '#/components/responses/PageNotFound'
 *  del:
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
 *        description: Not Implemented
 *        schema:
 *          $ref: '#/components/responses/NotImplemented'
 */
app.get('/:userid/private/:name', checkToken, requireServer, seagullApi.metaprivate_read);
app.del('/:userid/private/:name', checkToken, requireServer, seagullApi.metaprivate_delete);

/**
 * @swagger
 * /{userid}/{collection}:
 *  get:
 *    summary: Get the collection content (at the top level)
 *    description: Get the collection content (at the top level)
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
 *         description: Name of the collection (profile, groups) (private is not implemented)
 *         required: true
 *         schema:
 *           type: string
 *    responses:
 *      200:
 *        description: Collection content at the top level
 *        content:
 *          application/json:
 *            type: object
 *      400:
 *        description: Bad Request
 *        schema:
 *          $ref: '#/components/responses/BadRequest'
 *      401:
 *        description: Unauthorized
 *        schema:
 *          $ref: '#/components/responses/Unauthorized'
 *      404:
 *        description: Not Found
 *        schema:
 *          $ref: '#/components/responses/PageNotFound'
 *      500:
 *        description: Internal Server Error
 *        schema:
 *          $ref: '#/components/responses/InternalError'
 *  post:
 *    summary: Update the collection content
 *    description: Update the collection content
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
 *         description: Name of the collection (profile, groups) (private is not implemented)
 *         required: true
 *         schema:
 *           type: string
 *    requestBody:
 *      description: Collection update information
 *      required: true
 *      content:
 *        application/json:
 *          type: object
 *    responses:
 *      200:
 *        description: Success of update content at the top level
 *        content:
 *          application/json:
 *            type: object
 *      400:
 *        description: Bad Request
 *        schema:
 *          $ref: '#/components/responses/BadRequest'
 *      401:
 *        description: Unauthorized
 *        schema:
 *          $ref: '#/components/responses/Unauthorized'
 *      404:
 *        description: Not Found
 *        schema:
 *          $ref: '#/components/responses/PageNotFound'
 *  put:
 *    summary: Update the collection content. Can create if not existing
 *    description: Update the collection content. Can create if not existing
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
 *         description: Name of the collection (profile, groups) (private is not implemented)
 *         required: true
 *         schema:
 *           type: string
 *    requestBody:
 *      description: Collection update information
 *      required: true
 *      content:
 *        application/json:
 *          type: object
 *    responses:
 *      200:
 *        description: Success of update content at the top level
 *        content:
 *          application/json:
 *            type: object
 *      400:
 *        description: Bad Request
 *        schema:
 *          $ref: '#/components/responses/BadRequest'
 *      401:
 *        description: Unauthorized
 *        schema:
 *          $ref: '#/components/responses/Unauthorized'
 *      404:
 *        description: Not Found
 *        schema:
 *          $ref: '#/components/responses/PageNotFound'
 *  del:
 *    summary: Delete the collection content (not implemented)
 *    description: Delete the collection content (not implemented)
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
 *         description: Name of the collection (profile, groups) (private is not implemented)
 *         required: true
 *         schema:
 *           type: string
 *    responses:
 *      501:
 *        description: Not Implemented
 *        schema:
 *          $ref: '#/components/responses/NotImplemented'
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
