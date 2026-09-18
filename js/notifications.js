// ============================================================
// NOTIFICATIONS — unread message count + "your turn" game count
// ============================================================
// Lightweight, no extra setup needed (no push/service worker stuff —
// just live badge counts pulled from data already in Firestore).
//
// Unread messages: a conversation counts as unread if its last message
// wasn't sent by me, and is newer than the last time I opened it.
// "Last time I opened it" is tracked per-user right on the conversation
// doc itself, in a map field called lastReadBy: { uid: timestamp }.
//
// "Your turn" games: any active chess match where it's currently my color's turn.
// ============================================================

function listenUnreadMessageCount(uid, onUpdate) {
  return db.collection("conversations")
    .where("participants", "array-contains", uid)
    .onSnapshot((snapshot) => {
      let count = 0;
      snapshot.docs.forEach(doc => {
        const c = doc.data();
        if (!c.lastMessage || c.lastMessageSenderId === uid) return;
        const lastMsgTime = c.lastMessageAt ? c.lastMessageAt.toMillis() : 0;
        const readTime = (c.lastReadBy && c.lastReadBy[uid]) ? c.lastReadBy[uid].toMillis() : 0;
        if (lastMsgTime > readTime) count++;
      });
      onUpdate(count);
    }, (err) => console.error("Unread messages listener error:", err));
}

// Call this whenever a conversation is opened/viewed, to clear its badge.
async function markConversationRead(conversationId, uid) {
  try {
    await db.collection("conversations").doc(conversationId).update({
      ["lastReadBy." + uid]: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error("markConversationRead error:", err);
  }
}

function listenYourTurnGameCount(uid, onUpdate) {
  return db.collection("chess_matches")
    .where("players", "array-contains", uid)
    .onSnapshot((snapshot) => {
      let count = 0;
      snapshot.docs.forEach(doc => {
        const m = doc.data();
        if (m.status === "finished") return;
        const myColor = m.whiteId === uid ? "w" : "b";
        if (m.turn === myColor) count++;
      });
      onUpdate(count);
    }, (err) => console.error("Games listener error:", err));
}

// ---------- SHARED BADGE + TAB TITLE ----------
// Finds any nav link marked data-nav="chat" / data-nav="games" on the
// current page and keeps a little red count badge on it live. Also
// prefixes the browser tab title with the total unread count, e.g.
// "(3) Nekko — Home", so it's visible even from another tab.
// Safe to call on any page — pages with no matching nav links just
// won't show a badge, but the tab title still updates.
function attachNavBadges(uid) {
  let unreadMessages = 0;
  let yourTurnGames = 0;
  const baseTitle = document.title;

  function setBadge(navKey, count) {
    document.querySelectorAll('[data-nav="' + navKey + '"]').forEach(link => {
      let badge = link.querySelector(".nav-badge");
      if (count > 0) {
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "nav-badge";
          link.appendChild(badge);
        }
        badge.textContent = count > 9 ? "9+" : String(count);
      } else if (badge) {
        badge.remove();
      }
    });
  }

  function updateTitle() {
    const total = unreadMessages + yourTurnGames;
    document.title = total > 0 ? "(" + (total > 9 ? "9+" : total) + ") " + baseTitle : baseTitle;
  }

  listenUnreadMessageCount(uid, (count) => {
    unreadMessages = count;
    setBadge("chat", count);
    updateTitle();
  });

  listenYourTurnGameCount(uid, (count) => {
    yourTurnGames = count;
    setBadge("games", count);
    updateTitle();
  });
}
