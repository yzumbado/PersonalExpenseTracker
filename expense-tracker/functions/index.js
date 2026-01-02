const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { google } = require("googleapis");

admin.initializeApp();

const sheets = google.sheets("v4");

/**
 * Creates a new Spreadsheet for the user if they don't have one linked in Firestore.
 */
exports.createSpreadsheet = onRequest({ cors: true }, async (req, res) => {
  try {
    // 1. Authenticate Request
    const idToken = req.headers.authorization?.split("Bearer ")[1];
    if (!idToken) return res.status(401).send("Unauthorized");

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    // 2. Check if user already has a spreadsheet
    const userDocRef = admin.firestore().collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (userDoc.exists && userDoc.data().spreadsheetId) {
      return res.json({ spreadsheetId: userDoc.data().spreadsheetId, message: "Spreadsheet already exists" });
    }

    // 3. Create Spreadsheet
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"],
    });
    const authClient = await auth.getClient();

    const resource = {
      properties: {
        title: `Expenses - ${email}`,
      },
    };

    const spreadsheet = await sheets.spreadsheets.create({
      auth: authClient,
      resource,
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId;

    // 4. Header Row
    await sheets.spreadsheets.values.append({
      auth: authClient,
      spreadsheetId,
      range: "Sheet1!A1",
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [
          ["Date", "Time", "Amount", "Currency", "Category", "Merchant", "Notes", "Receipt URL"]
        ],
      },
    });

    // 5. Share with User
    const drive = google.drive({ version: "v3", auth: authClient });
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: "writer",
        type: "user",
        emailAddress: email,
      },
    });

    // 6. Save ID to Firestore
    await userDocRef.set({ spreadsheetId, email }, { merge: true });

    res.json({ spreadsheetId, message: "Spreadsheet created successfully" });

  } catch (error) {
    console.error("Error creating spreadsheet:", error);
    res.status(500).send(error.message);
  }
});

/**
 * Appends an expense row to the user's spreadsheet.
 */
exports.addExpense = onRequest({ cors: true }, async (req, res) => {
  try {
    // 1. Authenticate
    const idToken = req.headers.authorization?.split("Bearer ")[1];
    if (!idToken) return res.status(401).send("Unauthorized");
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // 2. Get Spreadsheet ID
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    if (!userDoc.exists || !userDoc.data().spreadsheetId) {
      return res.status(404).send("Spreadsheet not found. Please initialize first.");
    }
    const spreadsheetId = userDoc.data().spreadsheetId;

    // 3. Validate Input
    const { date, time, amount, currency, category, merchant, notes } = req.body;
    if (!amount || !date) {
      return res.status(400).send("Missing required fields (amount, date)");
    }

    // 4. Append to Sheet
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const authClient = await auth.getClient();

    await sheets.spreadsheets.values.append({
      auth: authClient,
      spreadsheetId,
      range: "Sheet1!A:H",
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [
          [date, time, amount, currency, category, merchant, notes, ""]
        ],
      },
    });

    res.json({ success: true, message: "Expense added" });

  } catch (error) {
    console.error("Error adding expense:", error);
    res.status(500).send(error.message);
  }
});
