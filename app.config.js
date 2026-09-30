// Extends app.json. Firebase config files are not committed to git (open source),
// so on EAS Build they are provided as file-type environment variables
// (GOOGLE_SERVICES_JSON / GOOGLE_SERVICE_INFO_PLIST). Locally, the files in the
// project root are used as before.
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    googleServicesFile:
      process.env.GOOGLE_SERVICE_INFO_PLIST ?? config.ios?.googleServicesFile,
  },
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile,
  },
});
