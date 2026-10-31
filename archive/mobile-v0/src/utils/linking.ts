import { Linking, Alert, Platform } from 'react-native';

export const makePhoneCall = (phoneNumber: string) => {
  const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
  if (!cleanNumber) {
    Alert.alert('Error', 'Invalid phone number');
    return;
  }
  const url = Platform.OS === 'android' ? `tel:${cleanNumber}` : `telprompt:${cleanNumber}`;
  Linking.canOpenURL(url)
    .then((supported) => {
      if (supported) {
        return Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Phone call facility is not available on this device');
      }
    })
    .catch((err) => console.error('An error occurred calling number', err));
};

export const openWhatsApp = (phoneNumber: string, message: string = 'Hello from GharTak!') => {
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  if (!cleanNumber) {
    Alert.alert('Error', 'Invalid phone number for WhatsApp');
    return;
  }
  const formattedNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
  const url = `whatsapp://send?phone=${formattedNumber}&text=${encodeURIComponent(message)}`;
  
  Linking.canOpenURL(url)
    .then((supported) => {
      if (supported) {
        return Linking.openURL(url);
      } else {
        // Fallback to web WhatsApp URL if app is not installed
        const webUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;
        return Linking.openURL(webUrl);
      }
    })
    .catch((err) => console.error('An error occurred opening WhatsApp', err));
};

