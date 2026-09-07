import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';

const PATNA_LOCALITIES = [
  'Boring Road',
  'Kankarbagh',
  'Patliputra Colony',
  'Bailey Road',
  'Rajendra Nagar',
  'Anisabad',
  'Danapur',
  'Ashiana Nagar',
  'Saguna More',
  'Exhibition Road',
  'Frazer Road',
  'Shastri Nagar',
];

interface AddressPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAddress: (address: string, locality: string) => void;
}

export const AddressPickerModal: React.FC<AddressPickerModalProps> = ({
  visible,
  onClose,
  onSelectAddress,
}) => {
  const [locality, setLocality] = useState<string>('Boring Road');
  const [streetAddress, setStreetAddress] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const handleAutoDetectLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to auto-detect your address.');
        setIsLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const formattedAddress = [place.name, place.street, place.subregion || place.city]
          .filter(Boolean)
          .join(', ');
        const detectedLocality = place.district || place.subregion || 'Patna';

        setStreetAddress(formattedAddress || `Lat: ${location.coords.latitude.toFixed(4)}, Long: ${location.coords.longitude.toFixed(4)}`);
        setLocality(detectedLocality);
      }
    } catch (error) {
      Alert.alert('Location Error', 'Unable to fetch current location. Please enter manually.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleConfirm = () => {
    if (!streetAddress.trim()) {
      Alert.alert('Required', 'Please enter or auto-detect street address.');
      return;
    }
    onSelectAddress(streetAddress.trim(), locality);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>📍 Delivery Location in Patna</Text>

          <TouchableOpacity
            style={styles.gpsBtn}
            onPress={handleAutoDetectLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator color="#2563EB" />
            ) : (
              <Text style={styles.gpsBtnText}>🎯 Auto-detect via GPS</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Select Patna Locality:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.localityScroll}>
            {PATNA_LOCALITIES.map((loc) => (
              <TouchableOpacity
                key={loc}
                style={[styles.localityChip, locality === loc && styles.selectedChip]}
                onPress={() => setLocality(loc)}
              >
                <Text style={[styles.chipText, locality === loc && styles.selectedChipText]}>
                  {loc}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Street / House / Landmark Address:</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Flat 302, Green Apartment, Boring Road"
            value={streetAddress}
            onChangeText={setStreetAddress}
            multiline
          />

          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.confirmBtn]} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Confirm Address</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  gpsBtn: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  gpsBtnText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginTop: 6,
  },
  localityScroll: {
    marginBottom: 14,
    maxHeight: 40,
  },
  localityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  selectedChip: {
    backgroundColor: '#2563EB',
  },
  chipText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  selectedChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  cancelText: {
    color: '#475569',
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: '#2563EB',
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

