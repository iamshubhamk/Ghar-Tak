import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { getCategoriesApi, getProvidersApi } from '../../api/client';
import { Category, ProviderItem } from '../../types';
import { CategoryCard } from '../../components/CategoryCard';
import { ProviderCard } from '../../components/ProviderCard';
import { AddressPickerModal } from '../../components/AddressPickerModal';

export const CustomerHomeScreen = ({ navigation }: any) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedLocality, setSelectedLocality] = useState<string>('Boring Road');
  const [selectedAddress, setSelectedAddress] = useState<string>('Boring Road, Patna');
  const [showAddressModal, setShowAddressModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catsData, provsData] = await Promise.all([
        getCategoriesApi(),
        getProvidersApi({ locality: selectedLocality }),
      ]);
      setCategories(catsData);
      setProviders(provsData);
    } catch (error) {
      console.error('Failed to load home data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedLocality]);

  const handleCategoryPress = (category: Category) => {
    setSelectedCategory(category.id === selectedCategory?.id ? null : category);
    navigation.navigate('CreateBooking', { category, locality: selectedLocality, address: selectedAddress });
  };

  const handleProviderSelect = (provider: ProviderItem) => {
    navigation.navigate('CreateBooking', {
      provider,
      category: selectedCategory,
      locality: selectedLocality,
      address: selectedAddress,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>DELIVERY LOCATION</Text>
          <TouchableOpacity
            style={styles.locationSelector}
            onPress={() => setShowAddressModal(true)}
          >
            <Text style={styles.locationText} numberOfLines={1}>
              📍 {selectedAddress}
            </Text>
            <Text style={styles.chevron}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
      >
        <View style={styles.heroBanner}>
          <Text style={styles.heroTitle}>Book Verified Experts in Patna</Text>
          <Text style={styles.heroSub}>Electricians, Plumbers, AC Repair & More at your doorstep</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Service Categories</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" style={styles.loader} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                onPress={handleCategoryPress}
                isSelected={selectedCategory?.id === cat.id}
              />
            ))}
          </ScrollView>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Verified Local Partners ({selectedLocality})</Text>
        </View>

        {providers.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No verified providers found in {selectedLocality} yet.</Text>
          </View>
        ) : (
          providers.map((prov) => (
            <ProviderCard
              key={prov.id}
              provider={prov}
              onSelect={handleProviderSelect}
            />
          ))
        )}
      </ScrollView>

      <AddressPickerModal
        visible={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSelectAddress={(addr, loc) => {
          setSelectedAddress(addr);
          setSelectedLocality(loc);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#0F172A',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    maxWidth: '90%',
  },
  chevron: {
    color: '#38BDF8',
    fontSize: 12,
    marginLeft: 6,
  },
  scrollContent: {
    padding: 16,
  },
  heroBanner: {
    backgroundColor: '#2563EB',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSub: {
    color: '#DBEAFE',
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  categoryScroll: {
    marginBottom: 20,
  },
  loader: {
    marginVertical: 20,
  },
  emptyContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    marginVertical: 10,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
});

