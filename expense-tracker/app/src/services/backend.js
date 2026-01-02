import { auth } from '../config/firebase';

// REPLACE with your actual Cloud Function base URL (e.g., from `firebase deploy` output)
const API_BASE_URL = "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net";

export const getAuthHeaders = async () => {
  const token = await auth.currentUser?.getIdToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const createSpreadsheet = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/createSpreadsheet`, {
    method: 'POST',
    headers,
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
};

export const addExpense = async (expenseData) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/addExpense`, {
    method: 'POST',
    headers,
    body: JSON.stringify(expenseData),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
};
