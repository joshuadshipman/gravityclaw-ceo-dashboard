const admin = require('firebase-admin');

// Initialize with the project ID
admin.initializeApp({
  projectId: 'total-loss-intake-bot'
});

const db = admin.firestore();

async function addTestCard() {
  const cardId = 'test-card-tiktok-001';
  await db.collection('launch_queue').doc(cardId).set({
    title: "TikTok Campaign: Total Loss Reality Check #1",
    description: "Educational hook: 'Texas Insurance laws your adjuster won't tell you.' Target: Mobile users (18-35).",
    status: "review",
    badgeText: "Agent Draft",
    badgeColor: "blue",
    priority: "HIGH",
    priorityClass: "high",
    meta: "Series C · Auto-Gen",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log("✅ Test card added to Firestore: " + cardId);
}

addTestCard().catch(console.error);
