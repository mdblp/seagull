# seagull

The Tidepool API for managing user metadata.

## Unreleased
### Engineering
YLP-756 Bump some dependencies

## 0.5.3 - 2021-05-06
### Engineering
- YLP-752 Fix depandabot alert

## 0.5.2 - 2021-03-18
### Fixed
- Requests to Crew (teams) did not send auth token

## 0.5.1 - 2021-03-05
### Fixed
- Remove legacy gatekeeper url (env var)

## 0.5.0 - 2021-02-16
### Changed
- YLP-474 Implement authorization rules for seagull

## 0.4.5 - 2020-10-28
### Engineering
- YLP-253 Review openapi generation so we can serve it through a website

## 0.4.4 - 2020-09-29
### Engineering
- PT-1527 Base seagull image on node:10-alpine

## 0.4.3 - 2020-09-22
### Changed
- PT-1437 Make service start without MongoDb available

## 0.4.2 - 2020-09-21
### Engineering
- Fix security audit && update to mongo 4.2 

## 0.4.1 - 2020-08-04
### Engineering
- Add openapi generation into the pipeline
- PT-1449 Add SOUP generation

## 0.4.0 - 2020-05-14
### Changed
- PT-1243 Remove Highwater
- PT-1276 Integrate Tidepool master for seagull
### Fixed
- PT-1274 Fix status route crash

## 0.3.2 - 2020-03-30
### Fixed
- PT-1192 Seagull: Don't make blip crash when a user is deleted but present in gatekeeper

## 0.3.1 - 2019-11-29
### Engineering
- PT-87 Update dependencies and node version to fix security issues.
  Enable npm audit scan in travis. 
## 0.3.0 - 2019-10-28
### Added
- [PT-733] Display the application version number on the status endpoint (/status).

## 0.2.0 - 2019-10-08
### Changed
- [PT-578] Integrate tidepool [v0.10.0](https://github.com/tidepool-org/seagull/releases/tag/v0.10.0)

## 0.1.0 - 2019-07-30
### Changed
- Integrate Tidepool [v0.7.2](https://github.com/tidepool-org/seagull/releases/tag/v0.7.2)
