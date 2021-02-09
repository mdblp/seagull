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

// expect violates this jshint thing a lot, so we just suppress it
/* jshint expr: true */

'use strict';

var _ = require('lodash');

var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
chai.use(sinonChai);
var expect = chai.expect;

var mockableObject = require('./mockable-object.js');

var env = {
  httpPort: 21000,
};

var mockCrudHandler = mockableObject.make('getDoc', 'closeDatabase', 'getDocs');
var mockUserApiClient = mockableObject.make('checkToken', 'getAnonymousPair', 'getUserInfo', 'getUsersWithIds');
var mockOpaClient = mockableObject.make('isAuthorized', 'serverAuthorized', 'selfAuthorized');
var mockTeamsClient = mockableObject.make('getTeams', 'getPatients');

var seagull = require('../lib/seagullService.js')(env, mockCrudHandler, mockUserApiClient, mockOpaClient, mockTeamsClient);
var supertest = require('supertest')('http://localhost:' + env.httpPort);

describe('seagull/users', function () {

  before(function (done) {
    seagull.start(done);
  });

  after(function () {
    seagull.close();
  });

  beforeEach(function () {
    mockableObject.reset(mockCrudHandler);
    mockableObject.reset(mockUserApiClient);
    mockableObject.reset(mockOpaClient);
    mockableObject.reset(mockTeamsClient);
  });

  describe('GET /users/:userid/users', function (done) {

    var alphaUser, alphaProfile, alphaTrustorPermissions, alphaTrusteePermissions, alphaDoc, alphaFinal;
    var bravoUser, bravoProfile, bravoTrustorPermissions, bravoTrusteePermissions, bravoDoc, bravoFinal;
    var targetUser, custodianUser;
    let targetTeams;
    let userDocs = {detail:{}};
    var serverToken, targetToken, custodianToken, viewerToken;

    var sessionTokenId;
    var targetUrl;

    function setupData() {
      alphaUser = { userid: 'alpha' };
      alphaProfile = { fullName: 'Alpha', patient: { birthday: '2001-11-30', diagnosisDate: '2010-12-31' } };
      alphaDoc = { profile: alphaProfile };
      alphaFinal = _.merge({}, alphaUser, 
        { 
          profile: {
            fullName : alphaProfile.fullName
          },
          invitationStatus: "accepted"
        }
      );

      bravoUser = { userid: 'bravo' };
      bravoProfile = { fullName: 'Bravo', patient: { birthday: '1970-01-30', diagnosisDate: '1990-02-31' } };
      bravoDoc = { profile: bravoProfile };
      bravoFinal = _.merge({}, bravoUser, 
        { 
          profile: {
            fullName : bravoProfile.fullName
          },
          invitationStatus: "accepted"
        },
      );

      targetUser = { userid: 'target' };

      custodianUser = { userid: 'custodian'};

      serverToken = { userid: 'server', isserver: true };
      targetToken = { userid: targetUser.userid, isserver: false };
      custodianToken = { userid: custodianUser.userid, isserver: false };
      viewerToken = { userid: 'stranger', isserver: false };
      
      sessionTokenId = targetToken.userid;

      serverToken = { userid: 'server', isserver: true };
      targetToken = { userid: targetUser.userid, isserver: false };
      custodianToken = { userid: custodianUser.userid, isserver: false };
      viewerToken = { userid: 'stranger', isserver: false };

      targetTeams = [
        {
          members:[
            {
              "userId":"alpha",
              "invitationStatus":"accepted"
            }
          ],
          patients:[
            {
              "userId": "bravo",
              "invitationStatus":"accepted"
            }
          ]
        }
      ];
      userDocs.detail[alphaUser.userid] = alphaDoc;
      userDocs.detail[bravoUser.userid] = bravoDoc;
      targetUrl = '/users/' + targetUser.userid + '/users';
    }

    var getDocsStub, closeDbStub, checkTokenStub, getUserInfoStub, getUsersWithIdsStub, selfAuthorizedStub, getTeamsStub, usersInGroupStub;
    const requestMatcher = (val,tgt) => {
      let out = _.get(val,'_tokendata.userid') === _.get(tgt,'userid') &&
             _.get(val,'_tokendata.isserver') === _.get(tgt,'isserver');
      return out
    }
    function setupStubs() {
      getDocsStub = sinon.stub(mockCrudHandler, 'getDocs');
      closeDbStub = sinon.stub(mockCrudHandler, 'closeDatabase');
      checkTokenStub = sinon.stub(mockUserApiClient, 'checkToken');
      selfAuthorizedStub = sinon.stub(mockOpaClient, 'selfAuthorized');
      getTeamsStub = sinon.stub(mockTeamsClient, 'getTeams');
      
      checkTokenStub.withArgs(serverToken.userid).callsArgWith(1, null, serverToken);
      checkTokenStub.withArgs(targetToken.userid).callsArgWith(1, null, targetToken);
      checkTokenStub.withArgs(custodianToken.userid).callsArgWith(1, null, custodianToken);
      checkTokenStub.withArgs(viewerToken.userid).callsArgWith(1, null, viewerToken);
      checkTokenStub.callsArgWith(1, { statusCode: 401 }, null);
      selfAuthorizedStub.withArgs(
        sinon.match((val)=>requestMatcher(val,targetToken)),
        [targetUser.userid]
      ).returns(true);
      selfAuthorizedStub.withArgs(
        sinon.match((val)=>requestMatcher(val,serverToken)),
        [targetUser.userid]).returns(true);
      selfAuthorizedStub.withArgs(
        sinon.match((val)=>requestMatcher(val,custodianToken)), 
        [targetUser.userid]).returns(true);
      selfAuthorizedStub.withArgs(
        sinon.match((val)=>requestMatcher(val,viewerToken)), 
        [targetUser.userid]).returns(false);
      getTeamsStub.withArgs(serverToken.userid).resolves(targetTeams);
      getTeamsStub.withArgs(targetToken.userid).resolves(targetTeams);
      getTeamsStub.withArgs(custodianToken.userid).resolves(targetTeams);
      getTeamsStub.withArgs(viewerToken.userid).resolves([]);
      getDocsStub.withArgs([alphaUser.userid,bravoUser.userid]).callsArgWith(1, null, userDocs);
    }

    beforeEach(function () {
      setupData();
      setupStubs();
    });

    function sanitizeUsers() {
      if (sessionTokenId !== serverToken.userid) {
        alphaFinal = _.omit(alphaFinal, 'passwordExists');
        bravoFinal = _.omit(bravoFinal, 'passwordExists');
      }
    }

    function test(url, statusCode, expectations, done) {
      supertest
        .get(url)
        .set('x-tidepool-session-token', sessionTokenId)
        .expect(statusCode)
        .end(function (err, res) {
          _.forEach(expectations, function (expectation) {
            expectation(err, res);
          });
          done(err);
        });
    }

    function expectSuccessfulTest(url, expectations, done) {
      return test(url, 200, _.flatten([expectNoError, expectations]), done);
    }

    function expectUnauthorizedTest(url, expectations, done) {
      return test(url, 401, _.flatten([expectNoError, expectations]), done);
    }

    function expectNoError(err, res) {
      expect(err).to.not.exist;
    }

    function expectBodyWithEmptyObject(err, res) {
      expect(res.body).deep.equals({});
    }

    function expectBodyWithEmptyArray(err, res) {
      expect(res.body).deep.equals([]);
    }

    function expectBodyWithAlpha(err, res) {
      sanitizeUsers();
      expect(res.body).deep.equals([alphaFinal]);
    }

    function expectBodyWithBravo(err, res) {
      sanitizeUsers();
      expect(res.body).deep.equals([bravoFinal]);
    }

    function expectBodyWithAlphaAndBravo(err, res) {
      sanitizeUsers();
      expect(res.body).deep.equals([alphaFinal, bravoFinal]);
    }

    function expectCheckToken() {
      expect(mockUserApiClient.checkToken).to.have.been.calledOnce;
      expect(mockUserApiClient.checkToken).to.have.been.calledWithExactly(sessionTokenId, sinon.match.func);
    }

    function expectGetTeamsNotCalled() {
      expect(mockTeamsClient.getTeams).to.not.have.been.called;
    }

    function expectGetTeams() {
      expectCheckToken();
      expect(mockTeamsClient.getTeams).to.have.been.calledOnce;
      expect(mockTeamsClient.getTeams).to.have.been.calledWithExactly(sinon.match.string);
    }

    function expectOpaSelfAuthorizedNotCalled() {
      expect(mockOpaClient.selfAuthorized).to.not.have.been.called;
    }
    function expectOpaSelfAuthorizedCalled() {
      expect(mockOpaClient.selfAuthorized).to.have.been.called;
    }

    function expectGroupsForUser() {
      expectCheckToken();
      expect(mockOpaClient.groupsForUser).to.have.been.calledOnce;
      expect(mockOpaClient.groupsForUser).to.have.been.calledWithExactly(targetUser.userid, sinon.match.func);
    }

    function expectUsersInGroup() {
      expectGroupsForUser();
      expect(mockOpaClient.usersInGroup).to.have.been.calledOnce;
      // sinon doesn't know about async function signatures, so we have to teach it.
      const asyncFunc = sinon.match(function (actual) {
        return sinon.typeOf(actual) === 'asyncfunction';
      }, 'typeOf(asyncfunction)');

      expect(mockOpaClient.usersInGroup).to.have.been.calledWithExactly(targetUser.userid, asyncFunc);
    }

    function expectGetUserInfoNotCalled() {
      expect(mockUserApiClient.getUserInfo).to.not.have.been.called;
    }

    function expectGetDocNotCalled() {
      expect(mockCrudHandler.getDocs).to.not.have.been.called;
    }

    function expectGetDocForAlpha() {
      expect(mockCrudHandler.getDocs).to.have.been.calledOnce;
      expect(mockCrudHandler.getDocs).to.have.been.calledWithExactly([alphaUser.userid], sinon.match.func);
    }

    function expectGetDocForBravo() {
      expect(mockCrudHandler.getDocs).to.have.been.calledOnce;
      expect(mockCrudHandler.getDocs).to.have.been.calledWithExactly([bravoUser.userid], sinon.match.func);
    }

    function expectGetDocForAlphaAndBravo() {
      expect(mockCrudHandler.getDocs).to.have.been.calledOnce;
      expect(mockCrudHandler.getDocs).to.have.been.calledWithExactly([alphaUser.userid,bravoUser.userid], sinon.match.func);
    }

    it('returns 401 without session token', function(done) {
      sessionTokenId = null;
      expectUnauthorizedTest(targetUrl,
          [expectBodyWithEmptyObject, expectGetTeamsNotCalled, expectOpaSelfAuthorizedNotCalled], done);
    });

    describe('with token data', function () {
      it('returns 401 with bogus session token', function(done) {
        sessionTokenId = 'bogus';
        expectUnauthorizedTest(targetUrl,
            [expectBodyWithEmptyObject, expectGetTeamsNotCalled, expectOpaSelfAuthorizedNotCalled], done);
      });

      it('returns 401 for a session token that is not the user, nor server, nor custodian, but is a shared user', function(done) {
        sessionTokenId = viewerToken.userid;
        expectUnauthorizedTest(targetUrl,
            [expectGetTeamsNotCalled, expectOpaSelfAuthorizedCalled], done);
      });

      it('returns success and two shared users with no query, as user', function(done) {
        expectSuccessfulTest(targetUrl,
            [expectBodyWithAlphaAndBravo, expectGetTeams, expectGetDocForAlphaAndBravo], done);
          });

      it('returns success and two shared users with no query, as server', function(done) {
        sessionTokenId = serverToken.userid;
        expectSuccessfulTest(targetUrl,
            [expectBodyWithAlphaAndBravo, expectGetTeams, expectGetDocForAlphaAndBravo], done);
      });

      it('returns success and two shared users with no query, as custodian', function(done) {
        sessionTokenId = custodianToken.userid;
        expectSuccessfulTest(targetUrl,
            [expectBodyWithAlphaAndBravo, expectGetTeams, expectGetDocForAlphaAndBravo], done);
      });

      it('returns failure with empty body due to error returned by userInGroup', function(done) {
        sessionTokenId = custodianToken.userid;
        getTeamsStub.withArgs(custodianToken.userid).rejects({status: 503, message: 'ERROR'});
        test(targetUrl, 503, [expectBodyWithEmptyObject], done);
      });
    });
  });
});
