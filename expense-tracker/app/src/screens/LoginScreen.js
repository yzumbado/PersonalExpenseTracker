import React from 'react';
import { StyleSheet, View, Text, Button, ActivityIndicator } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebase';

export default function LoginScreen() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    // REPLACE with actual Client IDs from Google Cloud Console
    iosClientId: 'YOUR_IOS_CLIENT_ID',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
    webClientId: 'YOUR_WEB_CLIENT_ID',
  });

  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setIsLoading(true);
      signInWithCredential(auth, credential)
        .catch((error) => console.error(error))
        .finally(() => setIsLoading(false));
    }
  }, [response]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expense Tracker</Text>
      <Text style={styles.subtitle}>Sign in to start tracking</Text>

      {isLoading ? (
        <ActivityIndicator size="large" />
      ) : (
        <Button
          disabled={!request}
          title="Sign in with Google"
          onPress={() => promptAsync()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
});
