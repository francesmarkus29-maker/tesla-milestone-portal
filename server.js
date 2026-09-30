const express = require('express');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, getDoc } = require('firebase/firestore');

// Your Firebase Web configuration (safe to use directly)
const firebaseConfig = {
  apiKey: "AIzaSyAmPw9Jubbvors-9V9y_uIivOl5Y92hBY",
  authDomain: "teslamilestone-6ce77.firebaseapp.com",
  projectId: "teslamilestone-6ce77",
  storageBucket: "teslamilestone-6ce77.firebasestorage.app",
  messagingSenderId: "603266005390",
  appId: "1:603266005390:web:219e0276e2ac5db068cdf"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const app = express();
app.use(express.json());

// Telegram Webhook Route
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    console.log("Received update from Telegram:", update);
    
    // Example: You can now read/write to Firestore here freely!
    
    res.status(200).send('Webhook processed successfully');
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});