// ============================================================
// POSTS & FEED LOGIC
// ============================================================

// ---------- DELETE POST (author, or admin) ----------
async function deletePost(postId) {
  await db.collection("posts").doc(postId).delete();
}
async function createPost(user, profile, text) {
  const cleanText = (text || "").trim();

  if (!cleanText) {
    throw new Error("Write something first.");
  }
  if (cleanText.length > 2000) {
    throw new Error("Post is too long (max 2000 characters).");
  }

  await db.collection("posts").add({
    authorId: user.uid,
    authorUsername: profile.username,
    text: cleanText,
    commentCount: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ---------- LIVE FEED (real-time, newest first) ----------
function listenToFeed(onUpdate) {
  return db.collection("posts")
    .orderBy("createdAt", "desc")
    .limit(50)
    .onSnapshot((snapshot) => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      onUpdate(posts);
    }, (err) => {
      console.error("Feed listener error:", err);
    });
}

// ---------- COMMENTS ----------
async function addComment(postId, user, profile, text) {
  const cleanText = (text || "").trim();
  if (!cleanText) throw new Error("Comment can't be empty.");
  if (cleanText.length > 500) throw new Error("Comment is too long (max 500 characters).");

  const postRef = db.collection("posts").doc(postId);
  const commentRef = postRef.collection("comments").doc();

  await db.runTransaction(async (t) => {
    t.set(commentRef, {
      authorId: user.uid,
      authorUsername: profile.username,
      text: cleanText,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    t.update(postRef, {
      commentCount: firebase.firestore.FieldValue.increment(1)
    });
  });
}

function listenToComments(postId, onUpdate) {
  return db.collection("posts").doc(postId).collection("comments")
    .orderBy("createdAt", "asc")
    .onSnapshot((snapshot) => {
      const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      onUpdate(comments);
    });
}

// ---------- SHARE (copies a direct link to this post) ----------
async function sharePost(postId) {
  const url = `${window.location.origin}${window.location.pathname.replace("dashboard.html", "")}dashboard.html?post=${postId}`;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (err) {
    // Fallback for browsers that block clipboard access
    prompt("Copy this link:", url);
    return false;
  }
}

// ---------- HELPERS ----------
function timeAgo(timestamp) {
  if (!timestamp) return "just now";
  const seconds = Math.floor((Date.now() - timestamp.toDate().getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
