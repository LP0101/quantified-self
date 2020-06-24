'use strict';

import * as functions from 'firebase-functions'
import { GarminHealthAPIAuth } from './garmin-health-api-auth';
import * as requestPromise from 'request-promise-native';
import { isCorsAllowed, setAccessControlHeadersOnResponse } from '../..';
import { getUserIDFromFirebaseToken } from '../../utils';
import * as admin from 'firebase-admin';
import * as crypto from "crypto";


// const OAUTH_SCOPES = 'workout';
const REQUEST_TOKEN_URI = 'https://connectapi.garmin.com/oauth-service/oauth/request_token'
const REQUEST_TOKEN_CONFIRMATION_URI = 'https://connect.garmin.com/oauthConfirm'
const ACCESS_TOKEN_URI = 'https://connectapi.garmin.com/oauth-service/oauth/access_token'

/**
 */
export const getGarminAuthRequestTokenRedirectURI = functions.region('europe-west2').https.onRequest(async (req, res) => {
  // Directly set the CORS header
  if (!isCorsAllowed(req) || (req.method !== 'OPTIONS' && req.method !== 'POST')) {
    console.error(`Not allowed`);
    res.status(403);
    res.send('Unauthorized');
    return
  }

  setAccessControlHeadersOnResponse(req, res);

  if (req.method === 'OPTIONS') {
    res.status(200);
    res.send();
    return;
  }

  const userID = await getUserIDFromFirebaseToken(req);
  if (!userID){
    res.status(403).send('Unauthorized');
    return;
  }

  const oAuth = GarminHealthAPIAuth();

  let result
  result = await requestPromise.post({
    headers: oAuth.toHeader(oAuth.authorize({
      url: REQUEST_TOKEN_URI,
      method: 'POST'
    })),
    url: REQUEST_TOKEN_URI,
  });

  const urlParams = new URLSearchParams(result);

  await admin.firestore().collection('garminHealthAPITokens').doc(userID).set({
    oauthToken: urlParams.get('oauth_token'),
    oauthTokenSecret: urlParams.get('oauth_token_secret'),
    state: crypto.randomBytes(20).toString('hex')
  })

  // Send the response wit hte prepeared stuff to the client and let him handle the state etc
  res.send({
    redirect_url: REQUEST_TOKEN_CONFIRMATION_URI,
  })
});


export const requestAndSetGarminHealthAPIAccessToken = functions.region('europe-west2').https.onRequest(async (req, res) => {
  // Directly set the CORS header
  if (!isCorsAllowed(req) || (req.method !== 'OPTIONS' && req.method !== 'POST')) {
    console.error(`Not allowed`);
    res.status(403);
    res.send('Unauthorized');
    return
  }

  setAccessControlHeadersOnResponse(req, res);

  if (req.method === 'OPTIONS') {
    res.status(200);
    res.send();
    return;
  }

  const userID = await getUserIDFromFirebaseToken(req);
  if (!userID){
    res.status(403).send('Unauthorized');
    return;
  }

  const state = req.body.state
  const oauthVerifier = req.body.oauthVerifier;

  if (!state || !oauthVerifier){
    res.status(500).send('Bad Request');
    return;
  }

  const tokensDocumentSnapshotData = (await admin.firestore().collection('garminHealthAPITokens').doc(userID).get()).data();
  if (!tokensDocumentSnapshotData || !tokensDocumentSnapshotData.state || !tokensDocumentSnapshotData.oauthToken || !tokensDocumentSnapshotData.oauthTokenSecret ){
    res.status(500).send('Bad request');
    return;
  }

  if (state !== tokensDocumentSnapshotData.state){
    res.status(403).send('Unauthorized');
    return;
  }

  const oAuth = GarminHealthAPIAuth();

  let result
  result = await requestPromise.post({
    headers: oAuth.toHeader(oAuth.authorize({
      url: ACCESS_TOKEN_URI,
      method: 'POST',
      data: {
        oauth_verifier: oauthVerifier,
      }
    }, {
      key: tokensDocumentSnapshotData.oauthToken,
      secret: tokensDocumentSnapshotData.oauthTokenSecret
    })),
    url: ACCESS_TOKEN_URI,
  });

  const urlParams = new URLSearchParams(result);
  await admin.firestore().collection('garminHealthAPITokens').doc(userID).set({
    accessToken: urlParams.get('oauth_token'),
    accessTokenSecret: urlParams.get('oauth_token_secret'),
    dateCreated: (new Date()).getTime()
  })
  res.send();
});

