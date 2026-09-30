const express = require('express');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAmPw9Jubbvors-9V9y_uIivOl5Y92hBY",
  authDomain: "teslamilestone-6ce77.firebaseapp.com",
  projectId: "teslamilestone-6ce77",
  storageBucket: "teslamilestone-6ce77.firebasestorage.app",
  messagingSenderId: "603266005390",
  appId: "1:603266005390:web:219e0276e2ac5db068cdf"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const app = express();
app.use(express.json());

// Manual CORS middleware so any frontend can talk to it without missing package errors
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Telegram Bot Webhook Route
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      if (text.startsWith('/deposit')) {
        const amount = parseFloat(text.split(' ')[1]) || 0;
        const userRef = doc(db, "users", chatId.toString());
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const currentBalance = userSnap.data().balance || 0;
          await updateDoc(userRef, { balance: currentBalance + amount });
        } else {
          await setDoc(userRef, { balance: amount, chatId: chatId });
        }
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).send('Internal Server Error');
  }
});

// Frontend Deposit API Route (Called from invest.html)
app.post('/api/deposit', async (req, res) => {
  try {
    const { chatId, amount } = req.body;
    if (!chatId || !amount) {
      return res.status(400).json({ error: "Missing chatId or amount" });
    }

    const userRef = doc(db, "users", chatId.toString());
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const currentBalance = userSnap.data().balance || 0;
      await updateDoc(userRef, { balance: currentBalance + parseFloat(amount) });
    } else {
      await setDoc(userRef, { balance: parseFloat(amount), chatId: chatId });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error processing deposit API:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});