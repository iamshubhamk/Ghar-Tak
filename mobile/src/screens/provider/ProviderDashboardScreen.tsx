import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { updateAvailabilityApi, uploadProviderDocumentApi } from '../../api/client';
import { RatingStars } from '../../components/RatingStars';

export const ProviderDashboardScreen = ({ navigation }: any) => {
  const { user, refreshUser } = useAuth();
  const provider = user?.provider_profile;
  const statusStr = provider?.verification_status?.toUpperCase() || '';
  const isVerified = statusStr === 'VERIFIED';
  const isPending = statusStr === 'PENDING_VERIFICATION' || statusStr === 'PENDING';


  const [isOnline, setIsOnline] = useState<boolean>(
    provider?.availability_status === 'AVAILABLE' || provider?.availability_status === 'online'
  );
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);

  const handleToggleOnline = async (value: boolean) => {
    try {
      setUpdatingStatus(true);
      const newStatus = value ? 'AVAILABLE' : 'UNAVAILABLE';
      await updateAvailabilityApi(newStatus as any);
      setIsOnline(value);
      await refreshUser();
    } catch (err: any) {
      Alert.alert('Status Error', err.message || 'Could not update availability.');
    } finally {
      setUpdatingStatus(false);
    }
  };


  const handleUploadAadhar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permission is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: 'aadhar.jpg',
        type: 'image/jpeg',
      } as any);
      formData.append('document_type', 'adhaar_card');

      try {
        setUploadingDoc(true);
        await uploadProviderDocumentApi(formData);
        await refreshUser();
        Alert.alert('Success', 'Aadhar card document uploaded successfully for admin review.');
      } catch (err: any) {
        Alert.alert('Upload Error', err.message || 'Could not upload document.');
      } finally {
        setUploadingDoc(false);
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Partner Dashboard</Text>
        <Text style={styles.providerName}>{user?.name}</Text>
      </View>

      {isPending ? (
        <View style={styles.pendingCard}>
          <Text style={styles.pendingTitle}>⏳ Profile Under Review</Text>
          <Text style={styles.pendingSub}>
            Your profile is currently awaiting admin verification in Patna. Please ensure your Aadhar photo is uploaded.
          </Text>
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={handleUploadAadhar}
            disabled={uploadingDoc}
          >
            {uploadingDoc ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.uploadBtnText}>📷 Upload Aadhar Card Photo</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.row}>
          <View>
            <Text style={styles.cardTitle}>Availability Status</Text>
            <Text style={styles.cardSub}>
              {isOnline ? '🟢 Available to receive local jobs' : '🔴 Currently Offline'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            disabled={updatingStatus || !isVerified}
            trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
            thumbColor={isOnline ? '#2563EB' : '#94A3B8'}
          />
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{provider?.average_rating?.toFixed(1) || '5.0'}</Text>
          <RatingStars rating={provider?.average_rating || 5} size={14} />
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{provider?.total_reviews || 0}</Text>
          <Text style={styles.statLabel}>Total Reviews</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{provider?.experience_years || 0} yrs</Text>
          <Text style={styles.statLabel}>Experience</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.jobsBtn}
        onPress={() => navigation.navigate('ProviderBookings')}
      >
        <Text style={styles.jobsBtnText}>📋 View Incoming Job Requests</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#F8FAFC',
    flexGrow: 1,
  },
  header: {
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  providerName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  pendingCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 4,
  },
  pendingSub: {
    fontSize: 13,
    color: '#B45309',
    lineHeight: 18,
    marginBottom: 12,
  },
  uploadBtn: {
    backgroundColor: '#D97706',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
  },
  jobsBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  jobsBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});

