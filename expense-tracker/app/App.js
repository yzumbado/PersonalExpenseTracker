import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import ManualInputScreen from './src/screens/ManualInputScreen';

function AppContent() {
  const { user } = useAuth();

  // Simple Conditional Routing
  return (
    <View style={styles.container}>
      {user ? <ManualInputScreen /> : <LoginScreen />}
      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
