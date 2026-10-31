import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BookingStatus } from '../types';

interface StatusBadgeProps {
  status: BookingStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeConfig = (status: BookingStatus) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'REQUESTED':
      case 'PENDING_ACCEPTANCE':
        return { label: 'Requested', bg: '#FEF3C7', text: '#D97706' };
      case 'ASSIGNED':
        return { label: 'Provider Assigned', bg: '#E0F2FE', text: '#0284C7' };
      case 'ACCEPTED':
        return { label: 'Booking Accepted', bg: '#DCFCE7', text: '#16A34A' };
      case 'IN_PROGRESS':
        return { label: 'In Progress', bg: '#F3E8FF', text: '#9333EA' };
      case 'COMPLETED':
        return { label: 'Completed', bg: '#D1FAE5', text: '#059669' };
      case 'REJECTED':
        return { label: 'Declined', bg: '#FEE2E2', text: '#DC2626' };
      case 'CANCELLED':
      case 'CANCELLED_BY_CUSTOMER':
      case 'CANCELLED_BY_PROVIDER':
      case 'CANCELLED_BY_ADMIN':
        return { label: 'Cancelled', bg: '#FEE2E2', text: '#DC2626' };
      default:
        return { label: String(status), bg: '#F1F5F9', text: '#64748B' };
    }
  };


  const config = getBadgeConfig(status);

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

