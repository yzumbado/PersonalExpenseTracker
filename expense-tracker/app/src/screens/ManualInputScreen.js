import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Button, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { addExpense, createSpreadsheet } from '../services/backend';
import { auth } from '../config/firebase';

export default function ManualInputScreen() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateSheet = async () => {
    try {
      setLoading(true);
      await createSpreadsheet();
      Alert.alert("Success", "Spreadsheet linked successfully!");
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!amount || !category) {
      Alert.alert("Validation", "Amount and Category are required");
      return;
    }

    try {
      setLoading(true);
      const data = {
        date,
        time: new Date().toLocaleTimeString(),
        amount,
        currency,
        category,
        merchant,
        notes
      };
      await addExpense(data);
      Alert.alert("Success", "Expense added!");
      // Reset form
      setAmount('');
      setMerchant('');
      setNotes('');
    } catch (e) {
      Alert.alert("Error", "Failed to add expense. Ensure spreadsheet is created first.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Hi, {auth.currentUser?.displayName || 'User'}</Text>
        <Button title="Link/Create Sheet" onPress={handleCreateSheet} />
      </View>

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} />

      <Text style={styles.label}>Amount</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="0.00"
      />

      <Text style={styles.label}>Currency</Text>
      <TextInput style={styles.input} value={currency} onChangeText={setCurrency} />

      <Text style={styles.label}>Category</Text>
      <TextInput
        style={styles.input}
        value={category}
        onChangeText={setCategory}
        placeholder="Food, Transport..."
      />

      <Text style={styles.label}>Merchant</Text>
      <TextInput style={styles.input} value={merchant} onChangeText={setMerchant} />

      <Text style={styles.label}>Notes</Text>
      <TextInput style={styles.input} value={notes} onChangeText={setNotes} />

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <View style={styles.buttonContainer}>
          <Button title="Save Expense" onPress={handleSubmit} />
        </View>
      )}

      <View style={styles.spacer} />
      <Button title="Sign Out" onPress={() => auth.signOut()} color="red" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
  },
  header: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcome: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    marginTop: 10,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 30,
  },
  spacer: {
    height: 30,
  }
});
