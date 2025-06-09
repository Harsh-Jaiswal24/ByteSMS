import { PermissionsAndroid, Platform } from 'react-native';

export const requestCameraPermission = async () => {
  if (Platform.OS === 'android') {
    const hasPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );
    if (hasPermission) return true;

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'App needs access to your camera to take photos.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
};

export const requestGalleryPermission = async () => {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 30) {
      return true;
    } else if (Platform.Version >= 29) {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );
      if (hasPermission) return true;

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission',
          message: 'App needs access to your files to select photos',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel'
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      const hasWrite = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      if (hasWrite) return true;

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission',
          message: 'App needs access to your files to select photos',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel'
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  }
  return true;
};