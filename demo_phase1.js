const assert = require('assert');

// --- MOCKING INFRASTRUCTURE ---

// 1. Mock Firebase Admin & Google APIs (The "Cloud")
const globalState = {
  users: {}, // Firestore
  sheets: {} // Google Sheets
};

const mocks = {
  'firebase-functions/v2/https': {
    onRequest: (opts, handler) => handler
  },
  'firebase-admin': {
    initializeApp: () => {},
    auth: () => ({
      verifyIdToken: async (token) => {
        if (token === 'valid-token') return { uid: 'user123', email: 'jules@example.com' };
        throw new Error('Invalid token');
      }
    }),
    firestore: () => ({
      collection: (name) => ({
        doc: (id) => ({
          get: async () => {
             const data = globalState.users[id];
             return { exists: !!data, data: () => data };
          },
          set: async (data, opts) => {
            console.log(`   [Firestore] Saving user data: ${JSON.stringify(data)}`);
            globalState.users[id] = { ...globalState.users[id], ...data };
          }
        })
      })
    })
  },
  'googleapis': {
    google: {
      auth: {
        GoogleAuth: class { async getClient() { return 'mock-client'; } }
      },
      sheets: () => ({
        spreadsheets: {
          create: async (params) => {
            const title = params.resource.properties.title;
            const newId = 'sheet-' + Math.floor(Math.random() * 1000);
            console.log(`   [Google Sheets] Created new sheet: "${title}" (ID: ${newId})`);
            globalState.sheets[newId] = [];
            return { data: { spreadsheetId: newId } };
          },
          values: {
            append: async (params) => {
              const id = params.spreadsheetId;
              const row = params.resource.values[0];
              globalState.sheets[id].push(row);
              console.log(`   [Google Sheets] Appended row to ${id}: [${row.join(', ')}]`);
              return {};
            }
          }
        }
      }),
      drive: () => ({
        permissions: {
          create: async (params) => {
            console.log(`   [Google Drive] Shared file ${params.fileId} with ${params.requestBody.emailAddress}`);
            return {};
          }
        }
      })
    }
  }
};

// 2. Intercept Requires to inject Mocks
const Module = require('module');
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (mocks[request]) return mocks[request];
  return originalLoad(request, parent, isMain);
};

// Load the Backend Code
const backend = require('./expense-tracker/functions/index.js');

// --- THE DEMO SCENARIO ---

async function runDemo() {
  console.log("=================================================");
  console.log("📱  STARTING PHASE 1 DEMO: EXPENSE TRACKER MVP  📱");
  console.log("=================================================\n");

  // Step 1: Login
  console.log("1️⃣  User Interaction: LOGIN");
  console.log("    User clicks 'Sign in with Google'...");
  const userToken = 'valid-token'; // Simulated token from Google
  console.log("    ✅ Authentication successful (User: jules@example.com)\n");

  // Step 2: Create Spreadsheet
  console.log("2️⃣  User Interaction: SETUP");
  console.log("    User clicks 'Link/Create Sheet' button...");

  const req1 = {
    headers: { authorization: `Bearer ${userToken}` },
    body: {}
  };
  const res1 = {
    status: (c) => ({ send: (m) => console.error(`    ❌ Error ${c}: ${m}`) }),
    json: (d) => console.log(`    ✅ Success! Server responded: "${d.message}" (Sheet ID: ${d.spreadsheetId})`)
  };

  await backend.createSpreadsheet(req1, res1);
  console.log("");

  // Step 3: Add Expense
  console.log("3️⃣  User Interaction: ADD EXPENSE");
  console.log("    User enters: $12.50 for 'Lunch' at 'Subway' (Category: Food)");
  console.log("    User clicks 'Save'...");

  const req2 = {
    headers: { authorization: `Bearer ${userToken}` },
    body: {
      date: '2023-10-27',
      time: '12:30',
      amount: '12.50',
      currency: 'USD',
      category: 'Food',
      merchant: 'Subway',
      notes: 'Sandwich'
    }
  };
  const res2 = {
    status: (c) => ({ send: (m) => console.error(`    ❌ Error ${c}: ${m}`) }),
    json: (d) => console.log(`    ✅ Success! Server responded: "${d.message}"`)
  };

  await backend.addExpense(req2, res2);
  console.log("");

  // Step 4: Verification
  console.log("4️⃣  VERIFICATION: CHECKING DATA STORAGE");
  console.log("    Inspecting the 'Cloud' (In-Memory Mock State)...");

  const user = globalState.users['user123'];
  const sheetId = user ? user.spreadsheetId : null;

  if (sheetId && globalState.sheets[sheetId]) {
    console.log(`    User 'user123' is linked to Sheet '${sheetId}'`);
    console.log("    Sheet Contents:");
    globalState.sheets[sheetId].forEach((row, i) => {
      console.log(`      Row ${i+1}: ${JSON.stringify(row)}`);
    });
    console.log("\n    ✅ DEMO PASSED: Data flowed from 'App' to 'Sheet' correctly.");
  } else {
    console.log("    ❌ DEMO FAILED: Data missing.");
  }
  console.log("=================================================");
}

runDemo().catch(console.error);
