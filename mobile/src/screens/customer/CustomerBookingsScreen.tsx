import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { getBookingsApi } from '../../api/client';
import { BookingItem } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { makePhoneCall, openWhatsApp } from '../../utils/linking';

export const CustomerBookingsScreen = ({ navigation }: any) => {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchBookings = async () => {
    try {
      const data = await getBookingsApi();
      setBookings(data);
    } catch (error) {
      console.error('Failed to load customer bookings', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const renderBooking = ({ item }: { item: BookingItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
      activeOpacity={0.8}
    >
      <View style={styles.headerRow}>
        <Text style={styles.categoryName}>{item.category_name || 'Home Service'}</Text>
        <StatusBadge status={item.status} />
      </View>

      <Text style={styles.address}>📍 {item.service_address}</Text>

      {item.provider_name ? (
        <Text style={styles.providerInfo}>👤 Partner: {item.provider_name}</Text>
      ) : (
        <Text style={styles.pendingAssigned}>⏳ Waiting for partner acceptance</Text>
      )}

      {item.issue_description ? (
        <Text style={styles.issueText} numberOfLines={2}>
          "{item.issue_description}"
        </Text>
      ) : null}

      <Text style={styles.dateText}>
        📅 Requested: {new Date(item.created_at).toLocaleDateString()}
      </Text>

      <View style={styles.actionRow}>
        {item.provider_phone ? (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.callBtn]}
              onPress={() => makePhoneCall(item.provider_phone!)}
            >
              <Text style={styles.callText}>📞 Call Partner</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.waBtn]}
              onPress={() => openWhatsApp(item.provider_phone!)}
            >
              <Text style={styles.waText}>💬 WhatsApp</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {(item.status || '').toUpperCase() === 'COMPLETED' ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.reviewBtn]}
            onPress={() => navigation.navigate('ReviewModal', { bookingId: item.id, providerId: item.provider_id })}
          >
            <Text style={styles.reviewBtnText}>⭐ Rate Service</Text>
          </TouchableOpacity>
        ) : null}

      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>My Bookings</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={styles.loader} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBooking}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBookings(); }} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>You haven't booked any services yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    paddingTop: 50,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  address: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 6,
  },
  providerInfo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 4,
  },
  pendingAssigned: {
    fontSize: 13,
    color: '#D97706',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  issueText: {
    fontSize: 13,
    color: '#64748B',
    marginVertical: 4,
    lineHeight: 18,
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtn: {
    backgroundColor: '#F1F5F9',
  },
  callText: {
    color: '#0F172A',
    fontWeight: '600',
    fontSize: 12,
  },
  waBtn: {
    backgroundColor: '#DCFCE7',
  },
  waText: {
    color: '#15803D',
    fontWeight: '600',
    fontSize: 12,
  },
  reviewBtn: {
    backgroundColor: '#FEF3C7',
  },
  reviewBtnText: {
    color: '#D97706',
    fontWeight: '700',
    fontSize: 12,
  },
  loader: {
    marginTop: 40,
  },
  emptyContainer: {
    padding: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
});

