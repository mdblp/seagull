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

const _ = require('lodash');
const bunyan = require('bunyan');

let baseLog = null;

function initLogger(level = "info") {
  console.log("initLogger", level);
  baseLog = bunyan.createLogger({ name: 'seagull', level });
  return baseLog;
}

function createLogger(filename, extraObjects) {
  console.log("createLogger", filename);
  if (baseLog === null) {
    initLogger();
  }
  if (extraObjects == null) {
    extraObjects = {};
  }

  const extras = _.cloneDeep(extraObjects);
  extras.srcFile = filename;

  return baseLog.child(extras);
}

exports.initLogger = initLogger;
exports.createLogger = createLogger;
