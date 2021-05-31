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

var amoeba = require('amoeba');
const { initLogger, createLogger } = require('./log.js');

(function () {
  var config = require('../env.js');
  var mongoConfig = {
    mongoConnectionString: config.mongoConnectionString
  };


  initLogger(config.logLevel);
  const log = createLogger('lib/index.js');

  var httpClient = amoeba.httpClient();
  var userApiClient = require('user-api-client').client(config.userApi, httpClient);
  var teamsClient = require('./teamsHandler.js')
  var service = require('./seagullService.js')(
    config,
    require('./mongoCrudHandler.js')(mongoConfig),
    userApiClient,
    require('tidepool-gatekeeper').opaClient,
    teamsClient
  );

  //let's get this party started
  service.start(function (err) {
    if (err != null) {
      throw err;
    }
    log.info('seagull started');
  });
})();
