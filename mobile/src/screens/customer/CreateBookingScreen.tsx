import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getCategoriesApi, createBookingApi } from '../../api/client';
import { Category, ProviderItem } from '../../types';

export const CreateBookingScreen = ({ route, navigation }: any) => {
  const initialCategory = route.params?.category || null;
  const initialProvider = route.params?.provider || null;
  const initialAddress = route.params?.address || 'Boring Road, Patna';
  const initialLocality = route.params?.locality || 'Boring Road';

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(initialCategory);
  const [selectedProvider, setSelectedProvider] = useState<ProviderItem | null>(initialProvider);
  const [address, setAddress] = useState<string>(initialAddress);
  const [locality, setLocality] = useState<string>(initialLocality);
  const [schedule, setSchedule] = useState<string>('As soon as possible');
  const [issueDescription, setIssueDescription] = useState<string>('');
  const [issuePhoto, setIssuePhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    getCategoriesApi().then((cats) => {
      setCategories(cats);
      if (!selectedCategory && cats.length > 0) {
        setSelectedCategory(cats[0]);
      }
    });
  }, []);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permissions are required to select photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setIssuePhoto(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permissions are required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setIssuePhoto(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a service category.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Error', 'Please enter your service address.');
      return;
    }

    try {
      setSubmitting(true);
      await createBookingApi({
        category_id: selectedCategory.id,
        provider_id: selectedProvider?.id,
        service_address: address.trim(),
        locality: locality.trim(),
        preferred_schedule: schedule.trim(),
        issue_description: issueDescription.trim(),
      });

      Alert.alert('Booking Submitted! 🎉', 'Service request has been sent to local providers.', [
        {
          text: 'View My Bookings',
          onPress: () => navigation.navigate('CustomerBookings'),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Booking Error', err.message || 'Could not submit booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Book a Service</Text>

      <Text style={styles.label}>Select Service Category *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.catChip,
              selectedCategory?.id === cat.id && styles.selectedCatChip,
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.catChipText,
                selectedCategory?.id === cat.id && styles.selectedCatChipText,
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedProvider ? (
        <View style={styles.providerCard}>
          <Text style={styles.providerLabel}>Selected Provider:</Text>
          <Text style={styles.providerName}>⭐ {selectedProvider.name}</Text>
          <Text style={styles.providerFee}>Fee: {selectedProvider.price_note || 'Standard rates'}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Service Address *</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        placeholder="Enter your full street address in Patna"
        multiline
      />

      <Text style={styles.label}>Locality</Text>
      <TextInput style={styles.input} value={locality} onChangeText={setLocality} />

      <Text style={styles.label}>Preferred Time / Schedule</Text>
      <TextInput
        style={styles.input}
        value={schedule}
        onChangeText={setSchedule}
        placeholder="e.g. Today at 4:00 PM"
      />

      <Text style={styles.label}>Problem / Issue Description</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        value={issueDescription}
        onChangeText={setIssueDescription}
        placeholder="Describe what needs repair or servicing..."
        multiline
      />

      <Text style={styles.label}>Attach Problem Photo (Optional)</Text>
      <View style={styles.photoRow}>
        <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
          <Text style={styles.photoBtnText}>📷 Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto}>
          <Text style={styles.photoBtnText}>🖼️ Gallery</Text>
        </TouchableOpacity>
      </View>

      {issuePhoto ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: issuePhoto }} style={styles.photoPreview} />
          <TouchableOpacity onPress={() => setIssuePhoto(null)} style={styles.removePhotoBtn}>
            <Text style={styles.removePhotoText}>Remove Photo</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitBtnText}>Confirm Service Request</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 12,
  },
  categoryPicker: {
    marginBottom: 14,
    maxHeight: 44,
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  selectedCatChip: {
    backgroundColor: '#2563EB',
  },
  catChipText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  selectedCatChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  providerCard: {
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginVertical: 8,
  },
  providerLabel: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
  },
  providerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
    marginTop: 2,
  },
  providerFee: {
    fontSize: 13,
    color: '#3B82F6',
    marginTop: 2,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#0F172A',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  photoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  photoBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoBtnText: {
    color: '#0F172A',
    fontWeight: '600',
    fontSize: 14,
  },
  previewContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  photoPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  removePhotoBtn: {
    marginTop: 6,
  },
  removePhotoText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});

