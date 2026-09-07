import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { ProviderItem } from '../types';
import { RatingStars } from './RatingStars';
import { makePhoneCall, openWhatsApp } from '../utils/linking';

interface ProviderCardProps {
  provider: ProviderItem;
  onSelect?: (provider: ProviderItem) => void;
  showActions?: boolean;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  onSelect,
  showActions = true,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.avatarContainer}>
          {provider.profile_photo_url ? (
            <Image source={{ uri: provider.profile_photo_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {provider.name ? provider.name.charAt(0).toUpperCase() : 'P'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{provider.name}</Text>
            <View
              style={[
                styles.badge,
                provider.availability_status === 'AVAILABLE' || provider.availability_status === 'online'
              ]}
            >
              <Text style={styles.badgeText}>
                {provider.availability_status === 'AVAILABLE' || provider.availability_status === 'online' ? 'Online' : 'Offline'}
              </Text>


          <View style={styles.ratingRow}>
            <RatingStars rating={provider.average_rating} size={16} />
            <Text style={styles.ratingText}>
              {provider.average_rating.toFixed(1)} ({provider.total_reviews} reviews)
            </Text>
          </View>
        </View>
      </View>

      {provider.bio ? (
          {provider.bio}
        </Text>
      ) : null}

      {provider.price_note ? (
        <Text style={styles.priceNote}>💰 {provider.price_note}</Text>
      ) : null}

      {showActions ? (
        <View style={styles.actionsRow}>
          {provider.phone ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.callBtn]}
                onPress={() => makePhoneCall(provider.phone!)}
              >
                <Text style={styles.callBtnText}>📞 Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.whatsappBtn]}
                onPress={() => openWhatsApp(provider.phone!)}
              >
                <Text style={styles.whatsappBtnText}>💬 WhatsApp</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {onSelect ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.selectBtn]}
              onPress={() => onSelect(provider)}
            >
              <Text style={styles.selectBtnText}>Book Provider</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
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
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  avatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  onlineBadge: {
    backgroundColor: '#DCFCE7',
  },
  offlineBadge: {
    backgroundColor: '#F1F5F9',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  experience: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#475569',
    marginLeft: 6,
    fontWeight: '600',
  },
  bio: {
    fontSize: 13,
    color: '#475569',
    marginTop: 10,
    lineHeight: 18,
  },
  priceNote: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369A1',
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtn: {
    backgroundColor: '#F1F5F9',
  },
  callBtnText: {
    color: '#0F172A',
    fontWeight: '600',
    fontSize: 13,
  },
  whatsappBtn: {
    backgroundColor: '#DCFCE7',
  },
  whatsappBtnText: {
    color: '#15803D',
    fontWeight: '600',
    fontSize: 13,
  },
  selectBtn: {
    backgroundColor: '#2563EB',
  },
  selectBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

