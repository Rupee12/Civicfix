
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
    updates: {
      url: 'https://u.expo.dev/69557ef5-6fdd-44fa-977f-df78b0b00509',
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
    },
    runtimeVersion: {
      policy: 'fingerprint',
    },

    ios: {
      supportsTablet: true,
    },

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
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'CAMERA',
      ],
      blockedPermissions: [
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ],
    },

    plugins: [
      'expo-location',
      [
        'expo-image-picker',
        {
          cameraPermission: 'Allow CivicFix to use your camera to photograph reported issues.',
          microphonePermission: false,
          photosPermission: false,
        },
      ],
      'expo-secure-store',
      'expo-updates',
    ],

    web: {
      favicon: './assets/favicon.png',
    },

    extra: {
      eas: {
        projectId: '69557ef5-6fdd-44fa-977f-df78b0b00509',
      },
    },
  };

  const plugins: NonNullable<ExpoConfig['plugins']> = [
    ...(appConfig.plugins ?? []),
  ];

  if (googleMapsApiKey) {
    plugins.push([
      'react-native-maps',
      { androidGoogleMapsApiKey: googleMapsApiKey },
    ]);
  }

  plugins.push([
    'expo-splash-screen',
    {
      image: './assets/splash-icon.png',
      imageWidth: 200,
      resizeMode: 'contain',
      backgroundColor: '#F5F7F2',
    },
  ]);

  if (process.env.NODE_ENV === 'development') {
    plugins.push('./plugins/withDevelopmentCleartextTraffic.js');
  }

  return {
    ...appConfig,
    plugins,
  };
};
