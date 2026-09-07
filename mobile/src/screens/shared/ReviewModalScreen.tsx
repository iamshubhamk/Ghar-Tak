import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { RatingStars } from '../../components/RatingStars';
import { createReviewApi } from '../../api/client';

export const ReviewModalScreen = ({ route, navigation }: any) => {
  const { bookingId } = route.params;
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmitReview = async () => {
    try {
      setSubmitting(true);
      await createReviewApi({
        booking_id: bookingId,
        rating,
        comment: comment.trim(),
      });
      Alert.alert('Thank You! ⭐', 'Your review has been submitted for this service.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Review Error', err.message || 'Could not submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rate Your Partner</Text>
      <Text style={styles.subtitle}>How was your home service experience in Patna?</Text>

      <View style={styles.starsContainer}>
        <RatingStars rating={rating} onRatingChange={setRating} readOnly={false} size={36} />
      </View>

      <Text style={styles.label}>Your Feedback (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Promptness, work quality, cleanliness..."
        value={comment}
        onChangeText={setComment}
        multiline
      />

      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleSubmitReview}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitBtnText}>Submit Review</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  starsContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});

