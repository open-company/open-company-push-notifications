// Expo Access Token: get or create one from https://expo.io/settings/access-tokens
module.exports.expoAccessToken = () => {
  return process.env.EXPO_ACCESS_TOKEN;
}
// Sentry Environment
module.exports.sentryEnv = () => {
  return process.env.SENTRY_ENVIRONMENT;
};
// Sentry DSN
module.exports.sentryDsn = () => {
  return process.env.SENTRY_DSN;
};
// Sentry release
module.exports.sentryRelease = () => {
  return process.env.SENTRY_RELEASE;
};
// Sentry deploy
module.exports.sentryReleaseDeploy = () => {
  return process.env.SENTRY_RELEASE_DEPLOY;
};