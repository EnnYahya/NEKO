// ============================================================
// AUTH LOGIC — username + password only, no email required
// ============================================================
// How it works under the hood:
// - Firebase Auth requires an email internally, so we generate
//   a hidden fake one: "<username>@nekko.local"
// - Real uniqueness is enforced via a Firestore "usernames" collection
// - Users only ever see/type their username, never the fake email
// ============================================================

function usernameToEmail(username) {
  return `${username.toLowerCase()}@${FAKE_EMAIL_DOMAIN}`;
}

function showBanner(el, message, type) {
  el.textContent = message;
  el.className = `status-banner show ${type}`;
}

function setLoading(button, isLoading, normalText) {
  button.disabled = isLoading;
  button.textContent = isLoading ? "Please wait…" : normalText;
}

// ---------- SIGN UP ----------
async function handleSignup(username, password) {
  const cleanUsername = username.trim().toLowerCase();

  if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
    throw new Error("Username must be 3-20 characters: letters, numbers, or underscores only.");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  // Check uniqueness FIRST, before creating the auth account
  const usernameDoc = await db.collection("usernames").doc(cleanUsername).get();
  if (usernameDoc.exists) {
    throw new Error("This username is already taken. Please choose another one.");
  }

  const email = usernameToEmail(cleanUsername);
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  const uid = cred.user.uid;

  // Reserve the username
  await db.collection("usernames").doc(cleanUsername).set({
    uid: uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  // Create the user's profile document
  await db.collection("users").doc(uid).set({
    username: cleanUsername,
    displayName: cleanUsername,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    bio: "",
    avatarUrl: "",
    // The one account named exactly "admin" gets moderator powers
    // (deleting posts, viewing the username list). Note this can
    // never include seeing anyone's password — Firebase Auth stores
    // passwords as one-way hashes and never exposes them to anyone,
    // including admins, by design.
    isAdmin: cleanUsername === "admin"
  });

  return uid;
}

// ---------- LOGIN ----------
async function handleLogin(username, password) {
  const cleanUsername = username.trim().toLowerCase();
  const email = usernameToEmail(cleanUsername);

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
      throw new Error("Incorrect username or password.");
    }
    throw new Error(err.message);
  }
}

// ---------- FORGOT PASSWORD (admin-mediated, no email needed) ----------
async function handleForgotPassword(username, contactNote) {
  const cleanUsername = username.trim().toLowerCase();
  if (!cleanUsername) throw new Error("Please enter your username.");

  await db.collection("password_reset_requests").add({
    username: cleanUsername,
    note: contactNote || "",
    status: "pending",
    requestedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ---------- LOGOUT ----------
async function handleLogout() {
  await auth.signOut();
}

// ---------- AUTH STATE GUARD (use on dashboard.html) ----------
function requireLogin(onReady) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "index.html";
    } else {
      onReady(user);
    }
  });
}
