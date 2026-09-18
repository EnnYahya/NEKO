// ============================================================
// CHAT LOGIC — direct messages between two users
// ============================================================
// Data model:
// conversations/{conversationId}
//   participants: [uidA, uidB]
//   participantUsernames: { uidA: "name", uidB: "name" }
//   lastMessage: "text preview"
//   lastMessageAt: timestamp
//   conversations/{conversationId}/messages/{messageId}
//     senderId, text, createdAt
//
// Conversation IDs are deterministic: the two UIDs sorted and joined,
// so starting a chat with the same person always reuses the same thread.
// ============================================================

function makeConversationId(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

// ---------- START OR OPEN A CONVERSATION BY USERNAME ----------
async function startConversationByUsername(currentUser, currentProfile, otherUsername) {
  const cleanUsername = otherUsername.trim().toLowerCase();
  if (cleanUsername === currentProfile.username) {
    throw new Error("You can't message yourself.");
  }

  const usernameDoc = await db.collection("usernames").doc(cleanUsername).get();
  if (!usernameDoc.exists) {
    throw new Error("No user found with that username.");
  }
  const otherUid = usernameDoc.data().uid;
  const conversationId = makeConversationId(currentUser.uid, otherUid);
  const convoRef = db.collection("conversations").doc(conversationId);
  const convoDoc = await convoRef.get();

  if (!convoDoc.exists) {
    await convoRef.set({
      participants: [currentUser.uid, otherUid],
      participantUsernames: {
        [currentUser.uid]: currentProfile.username,
        [otherUid]: cleanUsername
      },
      lastMessage: "",
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  return conversationId;
}

// ---------- START OR OPEN A CONVERSATION BY UID (used from a profile page) ----------
async function startConversationByUid(currentUser, currentProfile, otherUid, otherUsername) {
  if (otherUid === currentUser.uid) {
    throw new Error("You can't message yourself.");
  }
  const conversationId = makeConversationId(currentUser.uid, otherUid);
  const convoRef = db.collection("conversations").doc(conversationId);
  const convoDoc = await convoRef.get();

  if (!convoDoc.exists) {
    await convoRef.set({
      participants: [currentUser.uid, otherUid],
      participantUsernames: {
        [currentUser.uid]: currentProfile.username,
        [otherUid]: otherUsername
      },
      lastMessage: "",
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  return conversationId;
}

// ---------- LIVE LIST OF MY CONVERSATIONS ----------
// Note: sorting is done client-side (not via .orderBy in the query) to
// avoid requiring a manual Firestore composite index — array-contains
// combined with orderBy on a different field needs one, and this keeps
// setup to zero extra steps.
function listenToConversations(uid, onUpdate) {
  return db.collection("conversations")
    .where("participants", "array-contains", uid)
    .onSnapshot((snapshot) => {
      const convos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      convos.sort((a, b) => {
        const aTime = a.lastMessageAt ? a.lastMessageAt.toMillis() : 0;
        const bTime = b.lastMessageAt ? b.lastMessageAt.toMillis() : 0;
        return bTime - aTime;
      });
      onUpdate(convos);
    }, (err) => console.error("Conversations listener error:", err));
}

// ---------- SEND A MESSAGE ----------
async function sendMessage(conversationId, senderId, text) {
  const cleanText = (text || "").trim();
  if (!cleanText) return;
  if (cleanText.length > 1000) throw new Error("Message is too long (max 1000 characters).");

  const convoRef = db.collection("conversations").doc(conversationId);
  const messageRef = convoRef.collection("messages").doc();

  const batch = db.batch();
  batch.set(messageRef, {
    senderId,
    text: cleanText,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.update(convoRef, {
    lastMessage: cleanText,
    lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await batch.commit();
}

// ---------- LIVE MESSAGES IN A CONVERSATION ----------
function listenToMessages(conversationId, onUpdate) {
  return db.collection("conversations").doc(conversationId).collection("messages")
    .orderBy("createdAt", "asc")
    .limit(200)
    .onSnapshot((snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      onUpdate(messages);
    });
}

// ---------- HELPER: get the other participant's username ----------
function otherParticipantUsername(convo, myUid) {
  const otherUid = convo.participants.find(uid => uid !== myUid);
  return convo.participantUsernames[otherUid] || "Unknown";
}
