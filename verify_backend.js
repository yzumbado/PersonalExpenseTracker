const assert = require('assert');
const path = require('path');

// Mock Require Function
const originalRequire = module.require;
const mocks = {
  'firebase-functions/v2/https': {
    onRequest: (opts, handler) => {
      // Return the handler directly for testing
      return handler;
    }
  },
  'firebase-admin': {
    initializeApp: () => {},
    auth: () => ({
      verifyIdToken: async (token) => {
        if (token === 'valid-token') return { uid: 'user123', email: 'test@example.com' };
        throw new Error('Invalid token');
      }
    }),
    firestore: () => ({
      collection: (name) => ({
        doc: (id) => ({
          get: async () => {
             // Mock database state
             if (name === 'users' && id === 'user123') {
               return {
                 exists: true,
                 data: () => global.mockUserData || {}
               };
             }
             return { exists: false };
          },
          set: async (data, opts) => {
            console.log(`Firestore Set ${name}/${id}:`, data);
            if (name === 'users' && id === 'user123') {
               global.mockUserData = { ...global.mockUserData, ...data };
            }
          }
        })
      })
    })
  },
  'googleapis': {
    google: {
      auth: {
        GoogleAuth: class {
          async getClient() { return 'mock-client'; }
        }
      },
      sheets: () => ({
        spreadsheets: {
          create: async () => ({ data: { spreadsheetId: 'new-sheet-id' } }),
          values: {
            append: async (params) => {
              console.log('Sheets Append:', params.resource.values);
              return {};
            }
          }
        }
      }),
      drive: () => ({
        permissions: {
          create: async (params) => {
            console.log('Drive Permission:', params.requestBody);
            return {};
          }
        }
      })
    }
  }
};

const moduleProxy = new Proxy(module, {
  get: (target, prop) => {
    if (prop === 'require') {
      return (id) => {
        if (mocks[id]) return mocks[id];
        return originalRequire.call(target, id);
      };
    }
    return target[prop];
  }
});

// We need to override the global require or hook into it.
// Since we can't easily override global require in this context,
// we will load the file content and eval it with mocked require,
// OR simpler: use a library like `proxyquire` if available, but it's not.
// Let's use the 'module' module to intercept.

const Module = require('module');
const originalLoad = Module._load;

Module._load = function(request, parent, isMain) {
  if (mocks[request]) return mocks[request];
  return originalLoad(request, parent, isMain);
};

// Now load the function code
const functions = require('./expense-tracker/functions/index.js');

async function runTests() {
  console.log("Running Backend Logic Tests...");

  // Test 1: createSpreadsheet
  console.log("Test 1: createSpreadsheet");
  global.mockUserData = {}; // No sheet initially

  const req1 = {
    headers: { authorization: 'Bearer valid-token' },
    body: {}
  };
  const res1 = {
    status: (code) => ({ send: (msg) => console.log(`Status ${code}: ${msg}`) }),
    json: (data) => console.log("JSON Response:", data)
  };

  await functions.createSpreadsheet(req1, res1);
  assert.equal(global.mockUserData.spreadsheetId, 'new-sheet-id', 'Spreadsheet ID should be saved in Firestore');

  // Test 2: addExpense
  console.log("\nTest 2: addExpense");
  // Pre-condition: User has sheet (set in previous test)

  const req2 = {
    headers: { authorization: 'Bearer valid-token' },
    body: {
      date: '2023-10-27',
      time: '12:00',
      amount: '50.00',
      currency: 'USD',
      category: 'Food',
      merchant: 'Burger King',
      notes: 'Lunch'
    }
  };

  await functions.addExpense(req2, res1);
  // We rely on the logs to verify the 'Sheets Append' call occurred.

  console.log("\nTests Completed Successfully.");
}

runTests().catch(err => {
  console.error("Test Failed:", err);
  process.exit(1);
});
