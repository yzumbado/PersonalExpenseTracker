# Technical Design Document: Personal Expense Tracker

## 1. Problem Understanding and Scope

### 1.1 Problem Statement
The user requires a personal expense tracking application for iPhone that simplifies the process of recording daily expenses. The current friction in manual data entry often leads to abandoned habits. The user desires a solution that leverages automation (AI for receipts) and familiar tools (Google Sheets) without the complexity or cost of a heavy proprietary backend.

### 1.2 Scope
*   **Target Audience:** Personal users wanting to track expenses.
*   **Platform:** Mobile Application (iOS target, built with Cross-Platform tech).
*   **Key Value Proposition:** Easy input via photo (AI processing), voice dictation, or text, and full control of data via Google Sheets.

## 2. Requirements

### 2.1 Functional Requirements
1.  **User Authentication:** Support for multiple users. Each user accesses their own data.
2.  **Expense Input (Manual):** Form to input Amount, Merchant, Category, Date, Currency, and Notes.
3.  **Expense Input (Photo/AI):**
    *   Capture photo of a physical receipt.
    *   Use AI (Google Gemini) to analyze the image.
    *   Extract: Total Amount, Date, Merchant Name, and infer Category.
4.  **Expense Input (Voice/Dictation):**
    *   Record voice note (e.g., "Spent 15 dollars on lunch at McDonald's").
    *   Transcribe audio to text.
    *   Use LLM to extract structured expense data.
5.  **Data Storage:** All data must be saved as rows in a Google Sheet accessible by the user.
6.  **Multi-user Isolation:** User A's expenses go to User A's sheet; User B's to User B's sheet.

### 2.2 Non-Functional Requirements (Technical Constraints)
1.  **Frontend Framework:** React Native (Cross-platform capability).
2.  **AI Service:** Google Gemini (for image recognition and text processing).
3.  **Backend Philosophy:** Minimalist, low maintenance, low cost.
4.  **Web3:** Explicitly excluded.

## 3. Evaluation of Architecture & Hosting Options

To meet the goals of "Cost" and "Maintainability," we evaluated three approaches.

### Option 1: Serverless Cloud Architecture (Recommended)
*   **Description:** Use a Backend-as-a-Service (BaaS) like Firebase or Supabase combined with Cloud Functions.
*   **Pros:**
    *   **Zero Infrastructure Management:** No servers to patch or restart.
    *   **Cost:** "Pay as you go." Free tiers (e.g., Firebase Spark plan) usually cover personal/dev usage.
    *   **Scalability:** Handles multi-user load automatically.
    *   **Security:** Managed authentication and environment secret storage.
*   **Cons:** Vendor lock-in.

### Option 2: Self-Hosted (VPS/Docker)
*   **Description:** Rent a Linux VPS (e.g., DigitalOcean, Linode, Hetzner) running a Docker container with a Node.js/Python server.
*   **Pros:** Full control, fixed monthly cost, no vendor lock-in.
*   **Cons:**
    *   **High Maintenance:** Requires OS updates, security patches, log rotation, and uptime monitoring.
    *   **Higher Initial Cost:** ~$5/mo minimum even for zero traffic.
    *   **Complexity:** Setting up SSL, reverse proxies (Nginx), and CI/CD pipelines is manual work.

### Option 3: Web3 / Decentralized
*   **Status:** **Excluded** per user requirement.
*   **Reasoning:** Storing private financial data on a public ledger (even encrypted) is unnecessary for this use case. Decentralized storage (IPFS/Arweave) adds complexity to the simple requirement of "Google Sheets."

### Comparison Matrix

| Feature | Serverless (Option 1) | Self-Hosted (Option 2) |
| :--- | :--- | :--- |
| **Maintenance** | Low (Code only) | High (OS + Code) |
| **Cost (Low Vol)** | Free (usually) | ~$5-10/month |
| **Scalability** | Auto | Manual |
| **Setup Speed** | Fast | Slow |

### Final Decision
**Option 1 (Serverless Cloud)** is selected. It aligns perfectly with the "Low Cost" and "Low Maintenance" requirements. We will use **Firebase** for Authentication and **Firebase Cloud Functions** (or Vercel Serverless Functions) to proxy calls to Gemini and orchestrate Google Sheets API interactions securely.

## 4. Proposed Solution

### 4.1 Architecture Diagram
```
[iOS App (React Native)]
       |
       | (1) User Login (OAuth Google)
       v
[Firebase Auth]
       |
       | (2) Send Receipt Image / Voice Note
       v
[Cloud Function (Backend)] <------> [Google Gemini API]
       |                               (Analyze Receipt / Voice)
       |
       | (3) Append Row
       v
[Google Sheets API] <------> [User's Google Spreadsheet]
```

### 4.2 Technology Stack
*   **Frontend:** React Native (via **Expo**)
    *   *Why Expo?* Simplifies build process, OTA updates, and easy access to Camera/FileSystem/Microphone modules.
*   **Authentication:** Firebase Authentication (Google Sign-In Provider).
*   **Backend Logic:** Firebase Cloud Functions (Node.js/TypeScript).
    *   Acts as a secure gateway to store API keys (Gemini) and process business logic.
*   **AI Engine:** Google Gemini Flash 1.5 API.
    *   *Why?* Cost-effective, multimodal (vision + text), and fast.
*   **Database:** Google Sheets (via Google Sheets API v4).

### 4.3 Data Model (Google Sheet Columns)
The application will assume or create a sheet named "Expenses" with the following headers:
1.  **Date** (YYYY-MM-DD)
2.  **Time** (HH:MM)
3.  **Amount** (Decimal)
4.  **Currency** (USD, EUR, etc.)
5.  **Category** (Food, Transport, Utilities, etc.)
6.  **Merchant** (extracted text)
7.  **Notes** (User comments)
8.  **Receipt Image URL** (Optional - if we decide to upload the image to Drive/Storage)

### 4.4 Detailed Workflow

#### A. Authentication
1.  User opens app.
2.  Clicks "Sign in with Google".
3.  App requests scopes: `profile`, `email`, and `https://www.googleapis.com/auth/spreadsheets`.
4.  On success, user is authenticated.

#### B. Text Input Expense
1.  User fills form.
2.  App calls Backend Function `addExpense(data)`.
3.  Backend authenticates user, verifies input, and calls Google Sheets API to append row to the user's defined spreadsheet ID.

#### C. Photo Input Expense (The Core Feature)
1.  User takes a photo of receipt.
2.  App converts image to Base64 or uploads to temporary storage.
3.  App calls Backend Function `analyzeReceipt(image)`.
4.  **Backend -> Gemini:** Sends image with prompt: *"Extract date, total amount, currency, merchant name, and categorize this expense into one of [Food, Transport, Shopping, Other]. Return JSON."*
5.  **Gemini -> Backend:** Returns JSON data.
6.  **Backend -> App:** Returns extracted data.
7.  App pre-fills the "Manual Input" form with this data.
8.  User verifies/edits and clicks "Save".
9.  App proceeds to Step B (Save to Sheet).

#### D. Voice Input Expense
1.  User presses "Record".
2.  App records audio (or uses native Speech-to-Text).
3.  App sends text (or audio file) to Backend.
4.  **Backend -> Gemini:** Sends text/audio with prompt: *"Extract expense data from this natural language text: '[Transcribed Text]'. Return JSON with date, amount, currency, merchant, category."*
5.  **Gemini -> Backend:** Returns JSON data.
6.  **Backend -> App:** Returns extracted data.
7.  App pre-fills the "Manual Input" form with this data.
8.  User verifies/edits and clicks "Save".

## 5. Security & Privacy
*   **API Keys:** Gemini API keys are stored in Cloud Function Environment Variables (Secrets), never in the App code.
*   **User Data:** The backend does not persist expense data; it passes it directly to the user's Google Sheet.
*   **Access Control:** Google Sheets access is handled via the User's own OAuth token (passed to backend) or a Service Account imposter (if simplified), but User OAuth is preferred for strict privacy (the app acts on behalf of the user).

## 6. Future Expansion
*   **Analytics:** Read data back from Sheets to show charts in the app.
*   **Budgeting:** Compare monthly totals against limits.

## 7. Implementation Milestones

### Phase 1: MVP (Minimal Viable Product)
**Goal:** Functional expense tracking with manual input and secure storage.
1.  **Project Setup:** Initialize React Native (Expo) and Firebase project.
2.  **Authentication:** Implement Google Sign-in.
3.  **Google Sheets Integration:**
    *   Ability to create a new "Expenses" spreadsheet (or select existing).
    *   Backend function to append a row.
4.  **Manual Input UI:** Create the form for entering expense details manually.
5.  **Verification:** Test full flow (Login -> Input -> Sheet Update).

### Phase 2: AI & Automation
**Goal:** Reduce friction using Photo and Voice.
1.  **Camera Integration:** Add feature to take photo.
2.  **Gemini Integration:** Create cloud function to process images and return JSON.
3.  **Voice Integration:** Add dictation/recording feature and text-to-JSON processing.

### Phase 3: Polish & Analytics
**Goal:** Improve user experience and insights.
1.  **UI/UX Refinement:** Better loading states, error handling.
2.  **Analytics Dashboard:** Read sheet data to display simple charts (e.g., "This Month's Spending").
