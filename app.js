import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const state = {
  user: null,
  stories: [],
  profile: null,
  useLocalMode: !window.__FIREBASE_CONFIG__,
  storyToDelete: null,
};

const STORIES_COLLECTION = "stories_fresh_start";
const STORIES_STORAGE_KEY = "kh_stories_fresh_start";
const AUTHOR_USERNAME = "KTB";
const AUTHOR_PASSWORD = "MY";
const AUTHOR_SECRET = "astronaute de la mer";

let db;
if (!state.useLocalMode) {
  const app = initializeApp(window.__FIREBASE_CONFIG__);
  db = getFirestore(app);
}

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");
const postStoryBtn = document.getElementById("postStoryBtn");
const authDialog = document.getElementById("authDialog");
const authForm = document.getElementById("authForm");
const authError = document.getElementById("authError");
const registerBtn = document.getElementById("registerBtn");
const volunteerBtn = document.getElementById("volunteerBtn");
const closeAuthBtn = document.getElementById("closeAuthBtn");
const storyDialog = document.getElementById("storyDialog");
const storyForm = document.getElementById("storyForm");
const cancelStoryBtn = document.getElementById("cancelStoryBtn");
const deleteDialog = document.getElementById("deleteDialog");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const allStoriesEl = document.getElementById("allStories");
const myStoriesEl = document.getElementById("myStories");
const accountCard = document.getElementById("accountCard");
const accountStoriesEl = document.getElementById("accountStories");
const publishEmoji = document.getElementById("publishEmoji");

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

postStoryBtn.addEventListener("click", () => {
  if (!state.user) {
    authDialog.showModal();
    return;
  }
  storyDialog.showModal();
});

closeAuthBtn.addEventListener("click", () => authDialog.close());
cancelStoryBtn.addEventListener("click", () => storyDialog.close());
cancelDeleteBtn.addEventListener("click", () => {
  state.storyToDelete = null;
  deleteDialog.close();
});

confirmDeleteBtn.addEventListener("click", async () => {
  if (!state.storyToDelete) {
    deleteDialog.close();
    return;
  }

  await deleteStory(state.storyToDelete);
  state.storyToDelete = null;
  deleteDialog.close();
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await login();
});

registerBtn.addEventListener("click", async () => {
  await register();
});

volunteerBtn.addEventListener("click", () => {
  loginAsAuthorVolunteer();
});

storyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.user) return;

  const title = document.getElementById("storyTitle").value.trim();
  const content = document.getElementById("storyContent").value.trim();
  if (!title || !content) return;

  if (state.useLocalMode) {
    const stories = JSON.parse(localStorage.getItem(STORIES_STORAGE_KEY) || "[]");
    stories.push({
      id: crypto.randomUUID(),
      title,
      content,
      uid: state.user.id,
      authorUsername: state.user.username,
      createdAt: Date.now(),
      likedBy: [],
    });
    localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(stories));
    state.stories = stories.sort((a, b) => b.createdAt - a.createdAt);
    renderStories();
  } else {
    await addDoc(collection(db, STORIES_COLLECTION), {
      title,
      content,
      uid: state.user.id,
      authorUsername: state.user.username,
      createdAt: serverTimestamp(),
      likedBy: [],
    });
  }

  showPublishEmoji();
  storyForm.reset();
  storyDialog.close();
});

function attachStoryListEvents(container) {
  container.addEventListener("click", async (event) => {
    const likeBtn = event.target.closest("button[data-like-id]");
    if (likeBtn) {
      await toggleLike(likeBtn.dataset.likeId);
      return;
    }

    const deleteBtn = event.target.closest("button[data-delete-id]");
    if (deleteBtn) {
      requestDelete(deleteBtn.dataset.deleteId);
      return;
    }

    const clearLikesBtn = event.target.closest("button[data-clear-likes-id]");
    if (clearLikesBtn) {
      await clearLikes(clearLikesBtn.dataset.clearLikesId);
    }
  });
}

attachStoryListEvents(allStoriesEl);
attachStoryListEvents(myStoriesEl);
attachStoryListEvents(accountStoriesEl);

function requestDelete(storyId) {
  if (!state.user) {
    authDialog.showModal();
    return;
  }

  const story = state.stories.find((item) => item.id === storyId);
  if (!story || story.uid !== state.user.id) {
    return;
  }

  state.storyToDelete = storyId;
  deleteDialog.showModal();
}

async function deleteStory(storyId) {
  if (!state.user) return;

  if (state.useLocalMode) {
    const stories = JSON.parse(localStorage.getItem(STORIES_STORAGE_KEY) || "[]");
    const target = stories.find((story) => story.id === storyId);
    if (!target || (target.uid !== state.user.id && state.user.role !== "author")) {
      return;
    }

    const filtered = stories.filter((story) => story.id !== storyId);
    localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(filtered));
    state.stories = filtered.sort((a, b) => b.createdAt - a.createdAt);
    renderStories();
    return;
  }

  const ref = doc(db, STORIES_COLLECTION, storyId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  if (data.uid !== state.user.id && state.user.role !== "author") {
    return;
  }

  await deleteDoc(ref);
}

async function login() {
  authError.textContent = "";
  volunteerBtn.classList.add("is-hidden");
  const username = document.getElementById("authUsername").value.trim();
  const password = document.getElementById("authPassword").value.trim();
  if (!username || !password) {
    authError.textContent = "Pseudo et mot de passe requis.";
    return;
  }

  const id = normalizeId(username);

  if (username === AUTHOR_USERNAME && password === AUTHOR_PASSWORD) {
    authError.textContent = "Soit essayez un autre pseudo et mot de passe, soit utilisez "Ou bien être volontaire".";
    volunteerBtn.classList.remove("is-hidden");
    return;
  }

  if (state.useLocalMode) {
    const users = JSON.parse(localStorage.getItem("kh_users") || "{}");
    const user = users[id];
    if (!user || user.password !== password) {
      authError.textContent = "Compte introuvable ou mot de passe invalide.";
      return;
    }

    setSession({ id, username: user.username, role: "user" });
    state.user = { id, username: user.username, role: "user" };
    state.profile = user;
    authDialog.close();
    renderAccount();
    renderStories();
    return;
  }

  const snap = await getDoc(doc(db, "profiles", id));
  if (!snap.exists()) {
    authError.textContent = "Compte introuvable. Créez un compte.";
    return;
  }

  const profile = snap.data();
  if (profile.password !== password) {
    authError.textContent = "Mot de passe invalide.";
    return;
  }

  setSession({ id, username: profile.username, role: "user" });
  state.user = { id, username: profile.username, role: "user" };
  state.profile = profile;
  authDialog.close();
  renderAccount();
  renderStories();
}

async function register() {
  authError.textContent = "";
  volunteerBtn.classList.add("is-hidden");
  const username = document.getElementById("authUsername").value.trim();
  const password = document.getElementById("authPassword").value.trim();
  if (!username || !password) {
    authError.textContent = "Pseudo et mot de passe requis.";
    return;
  }

  const id = normalizeId(username);
  if (!id) {
    authError.textContent = "Pseudo invalide.";
    return;
  }

  if (state.useLocalMode) {
    const users = JSON.parse(localStorage.getItem("kh_users") || "{}");
    if (users[id]) {
      authError.textContent = "Pseudo déjà utilisé.";
      return;
    }

    users[id] = { username, password, bio: "" };
    localStorage.setItem("kh_users", JSON.stringify(users));
    setSession({ id, username, role: "user" });
    state.user = { id, username, role: "user" };
    state.profile = users[id];
    authDialog.close();
    renderAccount();
    renderStories();
    return;
  }

  const ref = doc(db, "profiles", id);
  const exists = await getDoc(ref);
  if (exists.exists()) {
    authError.textContent = "Pseudo déjà utilisé.";
    return;
  }

  const profile = { username, password, bio: "", createdAt: serverTimestamp() };
  await setDoc(ref, profile);

  setSession({ id, username, role: "user" });
  state.user = { id, username, role: "user" };
  state.profile = profile;
  authDialog.close();
  renderAccount();
  renderStories();
}

function renderAccount() {
  if (!state.user) {
    accountCard.innerHTML = `
      <p class="muted">Pas connecté.</p>
      <button id="openAuthFromAccount" class="btn btn-primary">Connexion / Créer un compte</button>
    `;
    document.getElementById("openAuthFromAccount")?.addEventListener("click", () => authDialog.showModal());
    accountStoriesEl.innerHTML = `<p class="muted">Connectez-vous pour voir vos histoires ici.</p>`;
    return;
  }

  const bio = state.profile?.bio || "Aucune bio";
  const password = state.profile?.password || "Non défini";

  accountCard.innerHTML = `
    <div class="profile-head">
      <div class="avatar">${escapeHtml(state.user.username[0]?.toUpperCase() || "U")}</div>
      <div>
        <p><strong>Pseudo:</strong> ${escapeHtml(state.user.username)}</p>
        <p><strong>Rôle:</strong> ${state.user.role === "author" ? "Auteur" : "Utilisateur"}</p>
        <p><strong>Mot de passe:</strong> ${escapeHtml(password)}</p>
        <p><strong>Bio:</strong> ${escapeHtml(bio)}</p>
      </div>
    </div>
    <div class="account-actions">
      <button id="editBioBtn" class="btn btn-ghost">Modifier la bio</button>
      <button id="logoutBtn" class="btn btn-ghost">Se déconnecter</button>
    </div>
  `;

  document.getElementById("editBioBtn")?.addEventListener("click", async () => {
    const newBio = window.prompt("Votre bio:", state.profile?.bio || "");
    if (newBio === null) return;
    await saveBio(newBio.trim());
  });

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    clearSession();
    state.user = null;
    state.profile = null;
    renderAccount();
    renderStories();
  });
}

function loginAsAuthorVolunteer() {
  const answer = window.prompt("Quelle est la métier de tes rêves ?");
  if (answer === null) return;

  const cleaned = answer.trim().toLowerCase();
  if (!cleaned.startsWith(AUTHOR_SECRET)) {
    window.alert("Vous n'êtes pas d'auteur. Essayez un autre mot de passe.");
    return;
  }

  const id = normalizeId(AUTHOR_USERNAME);
  state.user = { id, username: AUTHOR_USERNAME, role: "author" };
  state.profile = { username: AUTHOR_USERNAME, password: AUTHOR_PASSWORD, bio: "Auteur volontaire" };
  setSession({ id, username: AUTHOR_USERNAME, role: "author" });
  authDialog.close();
  volunteerBtn.classList.add("is-hidden");
  window.alert("Bienvenue, auteur");
  renderAccount();
  renderStories();
}

async function clearLikes(storyId) {
  if (!state.user || state.user.role !== "author") return;

  if (state.useLocalMode) {
    const stories = JSON.parse(localStorage.getItem(STORIES_STORAGE_KEY) || "[]");
    const index = stories.findIndex((s) => s.id === storyId);
    if (index < 0) return;
    stories[index].likedBy = [];
    localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(stories));
    state.stories = stories.sort((a, b) => b.createdAt - a.createdAt);
    renderStories();
    return;
  }

  const ref = doc(db, STORIES_COLLECTION, storyId);
  await setDoc(ref, { likedBy: [] }, { merge: true });
}

async function saveBio(bio) {
  if (!state.user) return;

  if (state.useLocalMode) {
    const users = JSON.parse(localStorage.getItem("kh_users") || "{}");
    users[state.user.id] = { ...users[state.user.id], bio };
    localStorage.setItem("kh_users", JSON.stringify(users));
    state.profile = users[state.user.id];
    renderAccount();
    return;
  }

  await setDoc(doc(db, "profiles", state.user.id), { bio }, { merge: true });
  state.profile = { ...state.profile, bio };
  renderAccount();
}

function storyTemplate(story) {
  const likedBy = story.likedBy || [];
  const liked = state.user ? likedBy.includes(state.user.id) : false;
  const canDelete = state.user && (story.uid === state.user.id || state.user.role === "author");
  const canModerateLikes = state.user && state.user.role === "author";

  return `
    <article class="story-card">
      <div class="story-head">
        <h3>${escapeHtml(story.title)}</h3>
        ${
          canDelete
            ? `<button class="btn delete-btn" data-delete-id="${story.id}" title="Supprimer cette histoire" aria-label="Supprimer cette histoire">X</button>`
            : ""
        }
      </div>
      <p class="story-meta">Par ${escapeHtml(story.authorUsername)} · ${formatDate(story.createdAt)}</p>
      <p>${escapeHtml(story.content).replace(/\n/g, "<br>")}</p>
      ${canModerateLikes ? `<button class="btn btn-ghost" data-clear-likes-id="${story.id}">Vider les likes</button>` : ""}
      <button class="btn like-btn ${liked ? "is-liked" : ""}" data-like-id="${story.id}" aria-label="J'aime">
        ❤️
      </button>
    </article>
  `;
}

function renderStories() {
  if (!state.stories.length) {
    allStoriesEl.innerHTML = `<p class="muted">Aucune histoire publiée pour le moment.</p>`;
    myStoriesEl.innerHTML = `<p class="muted">Aucune histoire personnelle pour le moment.</p>`;
    accountStoriesEl.innerHTML = `<p class="muted">Aucune histoire personnelle pour le moment.</p>`;
    return;
  }

  allStoriesEl.innerHTML = state.stories.map(storyTemplate).join("");

  const mine = state.user ? state.stories.filter((story) => story.uid === state.user.id) : [];
  const mineHtml = mine.length
    ? mine.map(storyTemplate).join("")
    : `<p class="muted">Aucune histoire personnelle pour le moment.</p>`;

  myStoriesEl.innerHTML = mineHtml;
  accountStoriesEl.innerHTML = state.user ? mineHtml : `<p class="muted">Connectez-vous pour voir vos histoires ici.</p>`;
}

async function toggleLike(storyId) {
  if (!state.user) {
    authDialog.showModal();
    return;
  }

  if (state.useLocalMode) {
    const stories = JSON.parse(localStorage.getItem(STORIES_STORAGE_KEY) || "[]");
    const index = stories.findIndex((s) => s.id === storyId);
    if (index < 0) return;

    const likedBy = stories[index].likedBy || [];
    const alreadyLiked = likedBy.includes(state.user.id);
    stories[index].likedBy = alreadyLiked ? likedBy.filter((id) => id !== state.user.id) : [...likedBy, state.user.id];

    localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(stories));
    state.stories = stories.sort((a, b) => b.createdAt - a.createdAt);
    renderStories();
    return;
  }

  const ref = doc(db, STORIES_COLLECTION, storyId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;

    const data = snap.data();
    const likedBy = data.likedBy || [];
    const alreadyLiked = likedBy.includes(state.user.id);
    const nextLikedBy = alreadyLiked ? likedBy.filter((id) => id !== state.user.id) : [...likedBy, state.user.id];

    transaction.update(ref, { likedBy: nextLikedBy });
  });
}

function subscribeStories() {
  if (state.useLocalMode) {
    state.stories = JSON.parse(localStorage.getItem(STORIES_STORAGE_KEY) || "[]").sort((a, b) => b.createdAt - a.createdAt);
    renderStories();

    window.addEventListener("storage", (event) => {
      if (event.key === STORIES_STORAGE_KEY) {
        state.stories = JSON.parse(event.newValue || "[]").sort((a, b) => b.createdAt - a.createdAt);
        renderStories();
      }
    });
    return;
  }

  const storiesQuery = query(collection(db, STORIES_COLLECTION), orderBy("createdAt", "desc"));
  onSnapshot(storiesQuery, (snapshot) => {
    state.stories = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderStories();
  });
}

async function loadProfile() {
  if (!state.user) return;

  if (state.useLocalMode) {
    const users = JSON.parse(localStorage.getItem("kh_users") || "{}");
    state.profile = users[state.user.id] || null;
    return;
  }

  const snap = await getDoc(doc(db, "profiles", state.user.id));
  state.profile = snap.exists() ? snap.data() : null;
}

function showPublishEmoji() {
  publishEmoji.classList.add("is-visible");
  window.setTimeout(() => {
    publishEmoji.classList.remove("is-visible");
  }, 700);
}

function normalizeId(value) {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

function formatDate(value) {
  if (!value) return "à l'instant";
  const timestamp = value.seconds ? value.seconds * 1000 : value;
  return new Date(timestamp).toLocaleString("fr-FR");
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

function escapeHtml(value) {
  const p = document.createElement("p");
  p.textContent = value;
  return p.innerHTML;
}

async function init() {
  state.user = getSession();
  if (state.user && !state.user.role) state.user.role = "user";
  await loadProfile();
  renderAccount();
  subscribeStories();
}

init();
