import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { getBookingsApi, updateBookingStatusApi } from '../../api/client';
import { BookingItem } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { makePhoneCall, openWhatsApp } from '../../utils/linking';

export const ProviderBookingsScreen = () => {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchBookings = async () => {
    try {
      const data = await getBookingsApi();
      setBookings(data);
    } catch (error) {
      console.error('Failed to fetch provider jobs', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    try {
      setUpdatingId(bookingId);
      await updateBookingStatusApi(bookingId, newStatus);
      await fetchBookings();
      Alert.alert('Status Updated', `Booking status changed to ${newStatus.replace('_', ' ')}.`);
    } catch (err: any) {
      Alert.alert('Update Error', err.message || 'Failed to update booking status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const renderJob = ({ item }: { item: BookingItem }) => {
    const isUpdating = updatingId === item.id;
    const st = (item.status || '').toUpperCase();

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.categoryName}>{item.category_name || 'Job Request'}</Text>
          <StatusBadge status={item.status} />
        </View>

        <Text style={styles.customerName}>👤 Customer: {item.customer_name || 'Patna Resident'}</Text>
        <Text style={styles.address}>📍 {item.service_address}</Text>

        {item.issue_description ? (
          <Text style={styles.issueText}>"{item.issue_description}"</Text>
        ) : null}

        {item.preferred_schedule ? (
          <Text style={styles.scheduleText}>⏰ Time: {item.preferred_schedule}</Text>
        ) : null}

        {item.customer_phone ? (
          <View style={styles.contactRow}>
            <TouchableOpacity
              style={[styles.contactBtn, styles.callBtn]}
              onPress={() => makePhoneCall(item.customer_phone!)}
            >
              <Text style={styles.callText}>📞 Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contactBtn, styles.waBtn]}
              onPress={() => openWhatsApp(item.customer_phone!)}
            >
              <Text style={styles.waText}>💬 WhatsApp</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.statusActionRow}>
          {st === 'REQUESTED' || st === 'PENDING_ACCEPTANCE' || st === 'ASSIGNED' ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => handleStatusUpdate(item.id, 'ACCEPTED')}
                disabled={isUpdating}
              >
                <Text style={styles.acceptText}>Accept Job</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.declineBtn]}
                onPress={() => handleStatusUpdate(item.id, 'REJECTED')}
                disabled={isUpdating}
              >
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {st === 'ACCEPTED' ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.progressBtn]}
              onPress={() => handleStatusUpdate(item.id, 'IN_PROGRESS')}
              disabled={isUpdating}
            >
              <Text style={styles.progressText}>Start Service (In Progress)</Text>
            </TouchableOpacity>
          ) : null}

          {st === 'IN_PROGRESS' ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.completeBtn]}
              onPress={() => handleStatusUpdate(item.id, 'COMPLETED')}
              disabled={isUpdating}
            >
              <Text style={styles.completeText}>Mark Job Completed 🎉</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {isUpdating ? <ActivityIndicator size="small" color="#2563EB" style={styles.updatingLoader} /> : null}
      </View>
    );
  };


  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Incoming Job Requests</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={styles.loader} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBookings(); }} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No job requests assigned yet.</Text>
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
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 6,
  },
  issueText: {
    fontSize: 13,
    color: '#64748B',
    marginVertical: 4,
    lineHeight: 18,
  },
  scheduleText: {
    fontSize: 13,
    color: '#D97706',
    fontWeight: '600',
    marginTop: 4,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  contactBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
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
  statusActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: '#16A34A',
  },
  acceptText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  declineBtn: {
    backgroundColor: '#EF4444',
  },
  declineText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  progressBtn: {
    backgroundColor: '#2563EB',
  },
  progressText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  completeBtn: {
    backgroundColor: '#059669',
  },
  completeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  updatingLoader: {
    marginTop: 8,
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

