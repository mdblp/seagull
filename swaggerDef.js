const pjson = require('./package.json');

module.exports = 
{
  "openapi": "3.0.0",
  "info": {
    "title": "Seagull API",
    "version": pjson.version,
    "description": "The Diabeloop API for managing user metadata",
    "license": {
      "name": "BSD-2-Clause",
      "url": "https://opensource.org/licenses/BSD-3-Clause"
    },
    "contact": {
      "name": "Diabeloop",
      "url": "https://www.diabeloop.com",
      "email": "platforms@diabeloop.fr"
    }
  }
};
