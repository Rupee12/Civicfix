const { withAndroidManifest } = require('expo/config-plugins');

module.exports = (config) => withAndroidManifest(config, (manifestConfig) => {
  const application = manifestConfig.modResults.manifest.application?.[0];
  if (application) application.$['android:usesCleartextTraffic'] = 'true';
  return manifestConfig;
});
