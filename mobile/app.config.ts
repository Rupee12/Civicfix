import type { ExpoConfig, ConfigContext } from 'expo/config';
import appJson from './app.json';

export default (_context: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  const appConfig = appJson.expo as ExpoConfig;
  const plugins = appConfig.plugins ?? [];

  return {
    ...appConfig,
    plugins: googleMapsApiKey
      ? [...plugins, ['react-native-maps', { androidGoogleMapsApiKey: googleMapsApiKey }]]
      : plugins,
  };
};
