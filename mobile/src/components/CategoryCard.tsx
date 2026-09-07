import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Category } from '../types';

interface CategoryCardProps {
  category: Category;
  onPress: (category: Category) => void;
  isSelected?: boolean;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onPress,
  isSelected = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.selectedCard]}
      onPress={() => onPress(category)}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>⚡</Text>
      </View>
      <Text style={[styles.name, isSelected && styles.selectedName]} numberOfLines={1}>
        {category.name}
      </Text>
      {category.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {category.description}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    margin: 6,
    flex: 1,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-start',
  },
  selectedCard: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconText: {
    fontSize: 22,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  selectedName: {
    color: '#2563EB',
  },
  description: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
});

