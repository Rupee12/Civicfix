import type { ExpoConfig, ConfigContext } from 'expo/config';

export default (_context: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  const appConfig: ExpoConfig = {
    name: 'CivicFix',
    slug: 'civicfix',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: { supportsTablet: true },
    android: {
      package: 'com.civicfix.mobile',
      versionCode: 1,
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'CAMERA', 'READ_MEDIA_IMAGES'],
    },
    plugins: ['expo-location', 'expo-image-picker', 'expo-secure-store'],
    web: { favicon: './assets/favicon.png' },
  };
  const plugins: NonNullable<ExpoConfig['plugins']> = [...(appConfig.plugins ?? [])];
  if (googleMapsApiKey) plugins.push(['react-native-maps', { androidGoogleMapsApiKey: googleMapsApiKey }]);
  plugins.push(['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 200, resizeMode: 'contain', backgroundColor: '#F5F7F2' }]);
  if (process.env.NODE_ENV === 'development') plugins.push('./plugins/withDevelopmentCleartextTraffic.js');

  return {
    ...appConfig,
    plugins,
  } as ExpoConfig;
};
