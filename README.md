# [OpenCompany](https://github.com/open-company) Push Notifications Lambda function

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

## Background

> Transparency, honesty, kindness, good stewardship, even humor, work in businesses at all times.

> -- [John Gerzema](http://www.johngerzema.com/)

Teams struggle to keep everyone on the same page. People are hyper-connected in the moment with chat and email, but it gets noisy as teams grow, and people miss key information. Everyone needs clear and consistent leadership, and the solution is surprisingly simple and effective - **great leadership updates that build transparency and alignment**.

With that in mind we designed [Carrot](https://carrot.io/), a software-as-a-service application powered by the open source [OpenCompany platform](https://github.com/open-company) and this source-available [web UI](https://github.com/open-company/open-company-web).

With Carrot, important company updates, announcements, stories, and strategic plans create focused, topic-based conversations that keep everyone aligned without interruptions. When information is shared transparently, it inspires trust, new ideas and new levels of stakeholder engagement. Carrot makes it easy for leaders to engage with employees, investors, and customers, creating alignment for everyone.

Transparency expectations are changing. Organizations need to change as well if they are going to attract and retain savvy teams, investors and customers. Just as open source changed the way we build software, transparency changes how we build successful companies with information that is open, interactive, and always accessible. Carrot turns transparency into a competitive advantage.

To get started, head to: [Carrot](https://carrot.io/)

## Local Setup

Prospective users of [Carrot](https://carrot.io/) should get started by going to [Carrot.io](https://carrot.io/). The following local setup is **for developers** wanting to work on the OpenCompany Notify Service.

Most of the dependencies are internal, meaning [NPM](https://npmjs.com) will handle getting them for you. There are a few exceptions:

* [Node](https://nodejs.org/en/download/) - a JavaScript runtime built on Chrome's V8 JavaScript engine.
* [NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) - Package management tool and Command Line Interface for node
* [Amazon Web Services DynamoDB](https://aws.amazon.com/dynamodb/) or [DynamoDB Local](http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html) - fast NoSQL database

## Overview

The OpenCompany Web Application provides a Web UI for creating and consuming open company content and data.

![OpenCompany Screenshot](https://open-company-assets.s3.amazonaws.com/new_homepage_screenshot.png)

#### Expo Push Notification Lambda Development

The notify service is responsible for sending push notifications to mobile users. Currently we use [Expo's Push Notification service](https://docs.expo.io/versions/latest/guides/push-notifications/) to accomplish this task. The only viable
SDK for working with this service at the time of writing was the [expo-server-node-sdk](https://github.com/expo/expo-server-sdk-node). Because of this, the notify service includes a [serverless](https://github.com/serverless/serverless) project in the
[expo-push-notifications](./expo-push-notifications) subfolder containing a few Lambda functions leveraging the SDK. When developing on these, it is useful to deploy experimental
changes without disrupting staging/prod. To do so:

```
# Install serverless globally (one-time setup)
npm install -g serverless

cd expo-push-notifications
serverless deploy --stage dev
```

**NB: the env var EXPO_PUSH_TOKEN variable, that is read by serverless throught config.js, is directly configured in the AWS Lambda from the Web GUI.**

At this time it's not possible to set environment variable via Ansible while deploying.

This will output the name of a Lambda function, the prefix of which will be used in the following configuration. For example, if the created Lambda function is named
`expo-push-notifications-dev-sendPushNotifications`, then the prefix would be `expo-push-notifications-dev-`.