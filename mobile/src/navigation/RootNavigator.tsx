import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterCustomerScreen } from '../screens/auth/RegisterCustomerScreen';
import { RegisterProviderScreen } from '../screens/auth/RegisterProviderScreen';

import { CustomerHomeScreen } from '../screens/customer/CustomerHomeScreen';
import { CustomerBookingsScreen } from '../screens/customer/CustomerBookingsScreen';
import { CreateBookingScreen } from '../screens/customer/CreateBookingScreen';

import { ProviderDashboardScreen } from '../screens/provider/ProviderDashboardScreen';
import { ProviderBookingsScreen } from '../screens/provider/ProviderBookingsScreen';

import { BookingDetailScreen } from '../screens/shared/BookingDetailScreen';
import { ReviewModalScreen } from '../screens/shared/ReviewModalScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="RegisterCustomer" component={RegisterCustomerScreen} />
    <Stack.Screen name="RegisterProvider" component={RegisterProviderScreen} />
  </Stack.Navigator>
);

const CustomerTabs = () => (
  <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2563EB' }}>
    <Tab.Screen
      name="Home"
      component={CustomerHomeScreen}
      options={{ tabBarLabel: 'Home' }}
    />
    <Tab.Screen
      name="CustomerBookings"
      component={CustomerBookingsScreen}
      options={{ tabBarLabel: 'My Bookings' }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ tabBarLabel: 'Profile' }}
    />
  </Tab.Navigator>
);

const ProviderTabs = () => (
  <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#F59E0B' }}>
    <Tab.Screen
      name="Dashboard"
      component={ProviderDashboardScreen}
      options={{ tabBarLabel: 'Dashboard' }}
    />
    <Tab.Screen
      name="ProviderBookings"
      component={ProviderBookingsScreen}
      options={{ tabBarLabel: 'Job Requests' }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ tabBarLabel: 'Profile' }}
    />
  </Tab.Navigator>
);

export const RootNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      {!user ? (
        <Stack.Screen name="Auth" component={AuthStack} options={{ headerShown: false }} />
      ) : user.role?.toLowerCase() === 'customer' ? (
        <>
          <Stack.Screen name="MainCustomer" component={CustomerTabs} options={{ headerShown: false }} />
          <Stack.Screen name="CreateBooking" component={CreateBookingScreen} options={{ title: 'New Booking' }} />
          <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Booking Status' }} />
          <Stack.Screen name="ReviewModal" component={ReviewModalScreen} options={{ title: 'Rate Service' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainProvider" component={ProviderTabs} options={{ headerShown: false }} />
          <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Job Details' }} />
        </>
      )}
    </Stack.Navigator>

  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
});

