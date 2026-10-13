import type { ExpoConfig, ConfigContext } from 'expo/config';
import appJson from './app.json';

export default (_context: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  const appConfig = appJson.expo as ExpoConfig;
  const plugins: NonNullable<ExpoConfig['plugins']> = [...(appConfig.plugins ?? [])];
  if (googleMapsApiKey) plugins.push(['react-native-maps', { androidGoogleMapsApiKey: googleMapsApiKey }]);
  plugins.push(['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 200, resizeMode: 'contain', backgroundColor: '#F5F7F2' }]);
  if (process.env.NODE_ENV === 'development') plugins.push('./plugins/withDevelopmentCleartextTraffic.js');

  return {
    ...appConfig,
    plugins,
  } as ExpoConfig;
};
