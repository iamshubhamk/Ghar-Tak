import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { getBookingDetailsApi } from '../../api/client';
import { BookingItem } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { makePhoneCall, openWhatsApp } from '../../utils/linking';

export const BookingDetailScreen = ({ route }: any) => {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<BookingItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getBookingDetailsApi(bookingId)
      .then((data) => setBooking(data))
      .catch((err) => console.error('Failed to load booking details', err))
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading || !booking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const phone = booking.provider_phone || booking.customer_phone;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.categoryTitle}>{booking.category_name || 'Booking Details'}</Text>
        <StatusBadge status={booking.status} />
      </View>

      <Text style={styles.bookingId}>ID: #{booking.id.substring(0, 8)}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Address</Text>
        <Text style={styles.sectionText}>📍 {booking.service_address}</Text>
        <Text style={styles.sectionText}>Locality: {booking.locality}</Text>
      </View>

      {booking.preferred_schedule ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Schedule</Text>
          <Text style={styles.sectionText}>⏰ {booking.preferred_schedule}</Text>
        </View>
      ) : null}

      {booking.issue_description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Issue Description</Text>
          <Text style={styles.sectionText}>"{booking.issue_description}"</Text>
        </View>
      ) : null}

      {booking.issue_photo_url ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Problem Photo</Text>
          <Image source={{ uri: booking.issue_photo_url }} style={styles.issueImage} />
        </View>
      ) : null}

      {phone ? (
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Direct Contact</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.callBtn]}
              onPress={() => makePhoneCall(phone)}
            >
              <Text style={styles.callText}>📞 Phone Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.waBtn]}
              onPress={() => openWhatsApp(phone)}
            >
              <Text style={styles.waText}>💬 WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  bookingId: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 20,
    marginTop: 4,
  },
  section: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sectionText: {
    fontSize: 15,
    color: '#0F172A',
    lineHeight: 22,
  },
  issueImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginTop: 6,
  },
  contactSection: {
    marginTop: 10,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  callBtn: {
    backgroundColor: '#F1F5F9',
  },
  callText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14,
  },
  waBtn: {
    backgroundColor: '#DCFCE7',
  },
  waText: {
    color: '#15803D',
    fontWeight: '700',
    fontSize: 14,
  },
});

