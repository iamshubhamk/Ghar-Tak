import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export const RegisterCustomerScreen = ({ navigation }: any) => {
  const { registerCustomer, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [defaultLocality, setDefaultLocality] = useState('Boring Road');

  const handleRegister = async () => {
    if (!name.trim() || (!email.trim() && !phone.trim()) || !password.trim()) {
      Alert.alert('Error', 'Please fill in your name, contact info, and password.');
      return;
    }

    try {
      await registerCustomer({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
        default_locality: defaultLocality,
      });
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Could not register customer.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Customer Signup</Text>
        <Text style={styles.subtitle}>Book verified local service providers in Patna</Text>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rahul Kumar"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="rahul@gmail.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="9876543210"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Default Patna Locality</Text>
          <TextInput
            style={styles.input}
            placeholder="Boring Road / Kankarbagh"
            value={defaultLocality}
            onChangeText={setDefaultLocality}
          />

          <Text style={styles.label}>Password (min 8 chars) *</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.registerBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    padding: 24,
    justifyContent: 'center',
    flexGrow: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 24,
  },
  formContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
  },
  registerBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  registerBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  backBtn: {
    alignItems: 'center',
    marginTop: 20,
  },
  backBtnText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '600',
  },
});

