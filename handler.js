const { Expo } = require('expo-server-sdk');
const Sentry = require('@sentry/serverless');

function sentryInit() {
  console.log(`Initializing Sentry...`);
  const sentryDSN = process.env.sentryDSN,
        sentryEnv = process.env.sentryEnv || 'local',
        sentryRelease = process.env.sentryRelease || 'release',
        sentryReleaseDeploy = process.env.sentryReleaseDeploy || 'deploy';

  console.log(`Config: ${{sentryDSN, sentryEnv, sentryRelease, sentryReleaseDeploy}}`);

  Sentry.AWSLambda.init({
    dsn: sentryDSN,
    environment: sentryEnv,
    release: sentryRelease,
    deploy: sentryReleaseDeploy,
    tracesSampleRate: 1.0
  });

  console.log(`Sentry initialized!`);
  return sentryEnv;
}

const successResponse = (data) => {
  return {
    statusCode: 200,
    body: JSON.stringify(data, null, 2)
  };
}

module.exports.sendPushNotifications = Sentry.AWSLambda.wrapHandler(async (event, context) => {
  const sentryEnv = sentryInit();
  console.log(`sendPushNotifications started on env ${sentryEnv}`);
  let expo = new Expo({ accessToken: process.env.expoAccessToken });
  const notifications = event.notifications;

  let messages = [];
  console.log(`Trying to send ${notifications.length} notifications...`);
  for (let notif of notifications) {
    // Each push token looks like ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
    console.log(`Try with: "${notif.pushToken}"`);

    // Check that all your push tokens appear to be valid Expo push tokens
    if (!Expo.isExpoPushToken(notif.pushToken)) {
      console.log(`Failed: not an expo push token`);
      const msg = `Push token "${notif.pushToken}" is not valid push token`;
      Sentry.captureError(new Error(msg, notif));
      continue;
    } else {
      messages.push({
        to: notif.pushToken,
        sound: 'default',
        body: notif.body,
        data: notif.data
      });
      console.log(`Pushed!`);
    }
  }
  console.log(`Retrieving tickets chucks.`);
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
  console.log(`Sending ${chunks.length} chunks...`);
  for (let chunk of chunks) {
    try {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
      console.log(`Done chuck: "${ticketChunk}".`);
    } catch (error) {
      console.log(`Failed on a chuck: ${error}.`);
      // console.error(error);
      Sentry.captureError(error);
      continue;
    }
  }

  console.log(`sendPushNotifications all good.`);
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
  const sentryEnv = sentryInit();
  console.log(`getPushNotificationReceipts started on env ${sentryEnv}`);
  const tickets = event.tickets;
  let expo = new Expo({ accessToken: process.env.expoAccessToken });
  let receiptIds = [];
  console.log(`Got ${tickets.length} tickets...`);
  for (let ticket of tickets) {
    // NOTE: Not all tickets have IDs; for example, tickets for notifications
    // that could not be enqueued will have error information and no receipt ID.
    if (ticket.id) {
      receiptIds.push(ticket.id);
    }
  }

  let receipts = [];
  let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
  console.log(`Found ${receiptIdChunks.length} chucks of receipt ID...`);
  for (let chunk of receiptIdChunks) {
    try {
      let receiptChunk = await expo.getPushNotificationReceiptsAsync(chunk);
      receipts.push(receiptChunk);
      console.log(`Pushed "${receiptChunk}".`);

      // The receipts specify whether Apple or Google successfully received the
      // notification and information about an error, if one occurred.
      // This loop is here strictly for the purposes of logging any problems/errors
      // for audit purposes; it does not affect this function's return value.
      console.log(`Checking status for ${receiptChunk.length} receipt chunks.`);
      for (let rid in receiptChunk) {
        const receipt = receiptChunk[rid];
        if (receipt.status === 'ok') {
          console.log(`Status is ok, moving on.`);
          continue;
        } else if (receipt.status === 'error') {
          // console.error(`There was an error sending a notification: ${receipt.message}`);
          const errorMessage = `There was an error sending a notification: ${receipt.message}`;
          Sentry.captureError(new Error(errorMessage, receipt));
          if (receipt.details && receipt.details.error) {
            const msg = `The error code is ${receipt.details.error}. See https://docs.expo.io/versions/latest/guides/push-notifications#response-format for error code docs.`;
            Sentry.captureMessage(msg);
          }
        }
      }
    } catch (error) {
      console.log(`Unhandled error: ${error}`);
      Sentry.captureError(error);
      continue;
    }
  }

  console.log(`getPushNotificationReceipts all good.`);
  return successResponse({ receipts });
});