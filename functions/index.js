const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();
const db = admin.firestore();

const TELEGRAM_BOT_TOKEN = "8630191514:AAHnhtahysDQC4wGpA3HW7FiAjjnWRCv9Fk";

exports.telegramWebhook = onRequest(async (req, res) => {
    try {
        const update = req.body;

        // Check if the update contains an inline keyboard button click (callback_query)
        if (update && update.callback_query) {
            const callbackQuery = update.callback_query;
            const data = callbackQuery.data; // e.g., "approve_UID_TX123456_1000" or "reject_UID_TX123456"
            const chatId = callbackQuery.message.chat.id;
            const messageId = callbackQuery.message.message_id;

            const parts = data.split("_");
            const action = parts[0]; // "approve" or "reject"
            const clientUid = parts[1];
            const txId = parts[2];

            const clientRef = db.collection("clients").doc(clientUid);
            const clientDoc = await clientRef.get();

            if (!clientDoc.exists) {
                await answerCallback(callbackQuery.id, "Error: Client record not found.");
                return res.status(200).send("OK");
            }

            const clientData = clientDoc.data();
            const transactions = clientData.transactions || [];
            let targetTx = transactions.find(t => t.id === txId);

            if (!targetTx) {
                await answerCallback(callbackQuery.id, "Error: Transaction ID missing.");
                return res.status(200).send("OK");
            }

            if (targetTx.status !== "Pending") {
                await answerCallback(callbackQuery.id, "Transaction already processed!");
                return res.status(200).send("OK");
            }

            if (action === "approve") {
                const amountToAdd = parseFloat(parts[3]);
                const currentPrincipal = clientData.investedPrincipal || 0;
                const newPrincipal = currentPrincipal + amountToAdd;

                // Update transaction status to Approved
                targetTx.status = "Approved";

                // Save changes to Firestore: update principal and modify array
                await clientRef.update({
                    investedPrincipal: newPrincipal,
                    transactions: transactions
                });

                // Edit Telegram message to show approval
                await editTelegramMessage(chatId, messageId, callbackQuery.message.text, `✅ *APPROVED & CREDITED* ($${amountToAdd.toLocaleString()} added to portfolio)`);
                await answerCallback(callbackQuery.id, "Successfully approved and credited user balance!");

            } else if (action === "reject") {
                // Update transaction status to Failed/Rejected
                targetTx.status = "Rejected";

                await clientRef.update({
                    transactions: transactions
                });

                // Edit Telegram message to show rejection
                await editTelegramMessage(chatId, messageId, callbackQuery.message.text, `❌ *PAYMENT REJECTED* (No funds added)`);
                await answerCallback(callbackQuery.id, "Payment rejected.");
            }
        }

        res.status(200).send("OK");
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).send("Server Error");
    }
});

async function answerCallback(callbackQueryId, text) {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text: text, show_alert: true })
    });
}

async function editTelegramMessage(chatId, messageId, oldText, statusLine) {
    const updatedText = `${oldText}\n\n-------------------\n*Status Update:* ${statusLine}`;
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: updatedText,
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [] } // Removes buttons once clicked
        })
    });
}