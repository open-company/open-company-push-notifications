'use strict';

const { Expo } = require('expo-server-sdk');
const Sentry = require('@sentry/serverless');

Sentry.AWSLambda.init({
  dsn: 'https://7a1944c77f8d4dea85a72b25398d795c@o23653.ingest.sentry.io/5480295',
  environment: process.env.SENTRY_ENVIRONMENT || 'local',
  tracesSampleRate: 1.0
});

const successResponse = (data) => {
  return {
    statusCode: 200,
    body: JSON.stringify(data, null, 2)
  };
}

const errorResponse = (statusCode, error) => {
  return ({
    statusCode,
    body: JSON.stringify({ error }, null, 2)
  });
}

// module.exports.sendPushNotifications = async event => {};

module.exports.sendPushNotifications = Sentry.AWSLambda.wrapHandler(async (event, context) => {
  let expo = new Expo();
  const notifications = event.notifications;

  let messages = [];
  for (let notif of notifications) {
    // Each push token looks like ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]

    // Check that all your push tokens appear to be valid Expo push tokens
    if (!Expo.isExpoPushToken(notif.pushToken)) {
      const msg = `Push token ${notif.pushToken} is not valid push token`;
      console.error(msg);
      return errorResponse(400, msg);
    }

    messages.push({
      to: notif.pushToken,
      sound: 'default',
      body: notif.body,
      data: notif.data
    });
  }

  // The Expo push notification service accepts batches of notifications so
  // that you don't need to send 1000 requests to send 1000 notifications. We
  // recommend you batch your notifications to reduce the number of requests
  // and to compress them (notifications with similar content will get
  // compressed).
  let chunks = expo.chunkPushNotifications(messages);

  // Send the chunks to the Expo push notification service. There are
  // different strategies you could use. A simple one is to send one chunk at a
  // time, which nicely spreads the load out over time:
  let tickets = [];
  for (let chunk of chunks) {
    try {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log(ticketChunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error(error);
      return errorResponse(500, error);
    }
  }

  return successResponse({ tickets });
});

// Later, after the Expo push notification service has delivered the
// notifications to Apple or Google (usually quickly, but allow the the service
// up to 30 minutes when under load), a "receipt" for each notification is
// created. The receipts will be available for at least a day; stale receipts
// are deleted.
//
// The ID of each receipt is sent back in the response "ticket" for each
// notification. In summary, sending a notification produces a ticket, which
// contains a receipt ID you later use to get the receipt.
//
// The receipts may contain error codes to which you must respond. In
// particular, Apple or Google may block apps that continue to send
// notifications to devices that have blocked notifications or have uninstalled
// your app. Expo does not control this policy and sends back the feedback from
// Apple and Google so you can handle it appropriately.

module.exports.getPushNotificationReceipts =  Sentry.AWSLambda.wrapHandler(async (event, context) => {

  const tickets = event.tickets;
  let expo = new Expo();
  let receiptIds = [];
  for (let ticket of tickets) {
    // NOTE: Not all tickets have IDs; for example, tickets for notifications
    // that could not be enqueued will have error information and no receipt ID.
    if (ticket.id) {
      receiptIds.push(ticket.id);
    }
  }

  let receipts = [];
  let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
  for (let chunk of receiptIdChunks) {
    try {
      let receiptChunk = await expo.getPushNotificationReceiptsAsync(chunk);
      console.log(receiptChunk);
      receipts.push(receiptChunk);

      // The receipts specify whether Apple or Google successfully received the
      // notification and information about an error, if one occurred.
      // This loop is here strictly for the purposes of logging any problems/errors
      // for audit purposes; it does not affect this function's return value.
      for (let rid in receiptChunk) {
        const receipt = receiptChunk[rid];
        if (receipt.status === 'ok') {
          continue;
        } else if (receipt.status === 'error') {
          console.error(`There was an error sending a notification: ${receipt.message}`);
          if (receipt.details && receipt.details.error) {
            console.error(
              `The error code is ${receipt.details.error}. See https://docs.expo.io/versions/latest/guides/push-notifications#response-format for error code docs.`
            );
          }
        }
      }
    } catch (error) {
      console.error(error);
      return errorResponse(500, error);
    }
  }

  return successResponse({ receipts });
});