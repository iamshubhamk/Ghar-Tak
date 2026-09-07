import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';

interface RatingStarsProps {
  rating: number;
  maxStars?: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  readOnly?: boolean;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxStars = 5,
  onRatingChange,
  size = 20,
  readOnly = true,
}) => {
  const stars = [];

  for (let i = 1; i <= maxStars; i++) {
    const isFilled = i <= Math.round(rating);
    stars.push(
      <TouchableOpacity
        key={i}
        disabled={readOnly}
        onPress={() => onRatingChange && onRatingChange(i)}
        style={styles.starTouch}
      >
        <Text style={{ fontSize: size, color: isFilled ? '#F59E0B' : '#CBD5E1' }}>
          ★
        </Text>
      </TouchableOpacity>
    );
  }

  return <View style={styles.container}>{stars}</View>;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starTouch: {
    paddingHorizontal: 2,
  },
});

