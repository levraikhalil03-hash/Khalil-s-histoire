import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getFirestore,
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc,
  setDoc,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const state = {
  user: null,
  profile: null,
  stories: [],
  useLocalMode: !window.__FIREBASE_CONFIG__,
};

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");
const postStoryBtn = document.getElementById("postStoryBtn");
const openAuthBtn = document.getElementById("openAuthBtn");
const authDialog = document.getElementById("authDialog");
const profileDialog = document.getElementById("profileDialog");
const storyDialog = document.getElementById("storyDialog");
const authForm = document.getElementById("authForm");
const registerBtn = document.getElementById("registerBtn");
const closeAuthBtn = document.getElementById("closeAuthBtn");
const profileForm = document.getElementById("profileForm");
const storyForm = document.getElementById("storyForm");
const cancelStoryBtn = document.getElementById("cancelStoryBtn");
const allStoriesEl = document.getElementById("allStories");
const myStoriesEl = document.getElementById("myStories");
const accountCard = document.getElementById("accountCard");
const authError = document.getElementById("authError");

let db;
if (!state.useLocalMode) {
  const app = initializeApp(window.__FIREBASE_CONFIG__);
  db = getFirestore(app);
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => {
      t.classList.toggle("is-active", t === tab);
      t.setAttribute("aria-selected", t === tab ? "true" : "false");
    });
    panels.forEach((panel) => {
      panel.classList.toggle("is-visible", panel.id === tab.dataset.tab);
    });
  });
});

openAuthBtn.addEventListener("click", () => authDialog.showModal());
closeAuthBtn.addEventListener("click", () => authDialog.close());

postStoryBtn.addEventListener("click", () => {
  if (!state.user) {
    authDialog.showModal();
    return;
  }
  storyDialog.showModal();
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await loginWithUsername();
});

registerBtn.addEventListener("click", async () => {
  await registerWithUsername();
});

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const bio = document.getElementById("profileBio").value.trim();
  if (!state.user) return;

  if (state.useLocalMode) {
    state.profile = { ...state.profile, bio };
    localStorage.setItem(`kh_profile_${state.user.id}`, JSON.stringify(state.profile));
  } else {
    await setDoc(
      doc(db, "profiles", state.user.id),
      {
        ...state.profile,
        bio,
      },
      { merge: true },
    );
    state.profile = { ...state.profile, bio };
  }

  profileDialog.close();
  renderAccount();
});

storyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.user) return;

  const title = document.getElementById("storyTitle").value.trim();
  const content = document.getElementById("storyContent").value.trim();
  if (!title || !content) return;

  if (state.useLocalMode) {
    const stories = JSON.parse(localStorage.getItem("kh_stories") || "[]");
    stories.push({
      id: crypto.randomUUID(),
      title,
      content,
      uid: state.user.id,
      authorUsername: state.user.username,
      createdAt: Date.now(),
      likedBy: [],
    });
    localStorage.setItem("kh_stories", JSON.stringify(stories));
    state.stories = stories.sort((a, b) => b.createdAt - a.createdAt);
    renderStories();
  } else {
    await addDoc(collection(db, "stories"), {
      title,
      content,
      uid: state.user.id,
      authorUsername: state.user.username,
      createdAt: serverTimestamp(),
      likedBy: [],
    });
  }

  storyForm.reset();
  storyDialog.close();
});

cancelStoryBtn.addEventListener("click", () => storyDialog.close());

allStoriesEl.addEventListener("click", async (event) => {
  const btn = event.target.closest("button[data-like-id]");
  if (!btn) return;
  await toggleLike(btn.dataset.likeId);
});

myStoriesEl.addEventListener("click", async (event) => {
  const btn = event.target.closest("button[data-like-id]");
  if (!btn) return;
  await toggleLike(btn.dataset.likeId);
});

async function loginWithUsername() {
  authError.textContent = "";
  const usernameRaw = document.getElementById("authUsername").value.trim();
  const password = document.getElementById("authPassword").value.trim();

  if (!usernameRaw || !password) {
    authError.textContent = "Pseudo et mot de passe requis.";
    return;
  }

  const userId = normalizeUserId(usernameRaw);

  if (state.useLocalMode) {
    const users = JSON.parse(localStorage.getItem("kh_users") || "{}");
    const found = users[userId];
    if (!found || found.password !== password) {
      authError.textContent = "Compte introuvable ou mot de passe invalide.";
      return;
    }
    setSession({ id: userId, username: found.username });
    state.profile = found;
    afterLogin();
    return;
  }

  const snap = await getDoc(doc(db, "profiles", userId));
  if (!snap.exists()) {
    authError.textContent = "Compte introuvable. Créez un compte.";
    return;
  }

  const profile = snap.data();
  if (profile.password !== password) {
    authError.textContent = "Mot de passe invalide.";
    return;
  }

  setSession({ id: userId, username: profile.username });
  state.profile = profile;
  afterLogin();
}

async function registerWithUsername() {
  authError.textContent = "";
  const usernameRaw = document.getElementById("authUsername").value.trim();
  const password = document.getElementById("authPassword").value.trim();

  if (!usernameRaw || !password) {
    authError.textContent = "Pseudo et mot de passe requis.";
    return;
  }

  const userId = normalizeUserId(usernameRaw);

  if (state.useLocalMode) {
    const users = JSON.parse(localStorage.getItem("kh_users") || "{}");
    if (users[userId]) {
      authError.textContent = "Pseudo déjà utilisé.";
      return;
    }
    users[userId] = { username: usernameRaw, password, bio: "" };
    localStorage.setItem("kh_users", JSON.stringify(users));
    setSession({ id: userId, username: usernameRaw });
    state.profile = users[userId];
    afterLogin();
    profileDialog.showModal();
    return;
  }

  const ref = doc(db, "profiles", userId);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    authError.textContent = "Pseudo déjà utilisé.";
    return;
  }

  const profile = {
    username: usernameRaw,
    password,
    bio: "",
    createdAt: serverTimestamp(),
  };

  await setDoc(ref, profile);
  setSession({ id: userId, username: usernameRaw });
  state.profile = profile;
  afterLogin();
  profileDialog.showModal();
}

function afterLogin() {
  state.user = getSession();
  authDialog.close();
  renderAccount();
  renderStories();
  updateTopbar();
}

function setSession(session) {
  localStorage.setItem("kh_session", JSON.stringify(session));
}

function getSession() {
  return JSON.parse(localStorage.getItem("kh_session") || "null");
}

function clearSession() {
  localStorage.removeItem("kh_session");
}

function normalizeUserId(username) {
  return username.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

function formatDate(value) {
  if (!value) return "à l'instant";
  const timestamp = value.seconds ? value.seconds * 1000 : value;
  return new Date(timestamp).toLocaleString("fr-FR");
}

function storyTemplate(story) {
  const likedBy = story.likedBy || [];
  const isLiked = state.user ? likedBy.includes(state.user.id) : false;
  const likes = likedBy.length;

  return `
    <article class="story-card">
      <h3>${escapeHtml(story.title)}</h3>
      <p class="story-meta">Par ${escapeHtml(story.authorUsername)} · ${formatDate(story.createdAt)}</p>
      <p>${escapeHtml(story.content).replace(/\n/g, "<br>")}</p>
      <button class="btn like-btn ${isLiked ? "is-liked" : ""}" data-like-id="${story.id}">
        ❤️ J'aime (${likes})
      </button>
    </article>
  `;
}

function renderStories() {
  if (!state.stories.length) {
    allStoriesEl.innerHTML = `<p class="muted">Aucune histoire publiée pour le moment.</p>`;
    myStoriesEl.innerHTML = `<p class="muted">Vous n'avez encore rien publié.</p>`;
    return;
  }

  allStoriesEl.innerHTML = state.stories.map(storyTemplate).join("");
  const mine = state.user ? state.stories.filter((s) => s.uid === state.user.id) : [];
  myStoriesEl.innerHTML = mine.length
    ? mine.map(storyTemplate).join("")
    : `<p class="muted">Vous n'avez encore rien publié.</p>`;
}

function renderAccount() {
  if (!state.user) {
    accountCard.innerHTML = "Connectez-vous pour voir votre profil.";
    accountCard.classList.add("muted");
    return;
  }

  accountCard.classList.remove("muted");
  const password = state.profile?.password || "Non défini";
  const bio = state.profile?.bio || "Aucune bio pour le moment.";
  accountCard.innerHTML = `
    <div class="profile-head">
      <div class="avatar">${escapeHtml(state.user.username[0]?.toUpperCase() || "U")}</div>
      <div>
        <p><strong>Pseudo:</strong> ${escapeHtml(state.user.username)}</p>
        <p><strong>Mot de passe:</strong> ${escapeHtml(password)}</p>
      </div>
    </div>
    <p><strong>Bio:</strong> ${escapeHtml(bio)}</p>
    <div class="account-actions">
      <button id="editBioBtn" class="btn btn-ghost">Modifier la bio</button>
      <button id="logoutBtn" class="btn btn-ghost">Se déconnecter</button>
    </div>
  `;

  document.getElementById("editBioBtn")?.addEventListener("click", () => {
    document.getElementById("profileBio").value = state.profile?.bio || "";
    profileDialog.showModal();
  });

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    state.user = null;
    state.profile = null;
    clearSession();
    renderAccount();
    renderStories();
    updateTopbar();
  });
}

function updateTopbar() {
  openAuthBtn.textContent = state.user ? `Connecté: ${state.user.username}` : "Connexion";
}

async function loadProfile() {
  if (!state.user) return;

  if (state.useLocalMode) {
    const users = JSON.parse(localStorage.getItem("kh_users") || "{}");
    state.profile = users[state.user.id] || null;
    renderAccount();
    return;
  }

  const snap = await getDoc(doc(db, "profiles", state.user.id));
  state.profile = snap.exists() ? snap.data() : null;
  renderAccount();
}

async function toggleLike(storyId) {
  if (!state.user) {
    authDialog.showModal();
    return;
  }

  if (state.useLocalMode) {
    const stories = JSON.parse(localStorage.getItem("kh_stories") || "[]");
    const idx = stories.findIndex((story) => story.id === storyId);
    if (idx < 0) return;
    const likedBy = stories[idx].likedBy || [];
    const hasLiked = likedBy.includes(state.user.id);
    stories[idx].likedBy = hasLiked ? likedBy.filter((id) => id !== state.user.id) : [...likedBy, state.user.id];
    localStorage.setItem("kh_stories", JSON.stringify(stories));
    state.stories = stories.sort((a, b) => b.createdAt - a.createdAt);
    renderStories();
    return;
  }

  const ref = doc(db, "stories", storyId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    const likedBy = data.likedBy || [];
    const hasLiked = likedBy.includes(state.user.id);
    const updated = hasLiked ? likedBy.filter((id) => id !== state.user.id) : [...likedBy, state.user.id];
    transaction.update(ref, { likedBy: updated });
  });
}

function subscribeStories() {
  if (state.useLocalMode) {
    state.stories = JSON.parse(localStorage.getItem("kh_stories") || "[]").sort((a, b) => b.createdAt - a.createdAt);
    renderStories();
    window.addEventListener("storage", (event) => {
      if (event.key === "kh_stories") {
        state.stories = JSON.parse(event.newValue || "[]").sort((a, b) => b.createdAt - a.createdAt);
        renderStories();
      }
    });
    return;
  }

  const q = query(collection(db, "stories"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    state.stories = snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
    renderStories();
  });
}

async function initAuth() {
  state.user = getSession();
  updateTopbar();
  if (state.user) {
    await loadProfile();
  } else {
    renderAccount();
  }
  subscribeStories();
}

initAuth();
