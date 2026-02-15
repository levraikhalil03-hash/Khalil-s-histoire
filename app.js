import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
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
const authDialog = document.getElementById("authDialog");
const profileDialog = document.getElementById("profileDialog");
const storyDialog = document.getElementById("storyDialog");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const profileForm = document.getElementById("profileForm");
const storyForm = document.getElementById("storyForm");
const cancelStoryBtn = document.getElementById("cancelStoryBtn");
const allStoriesEl = document.getElementById("allStories");
const myStoriesEl = document.getElementById("myStories");
const accountCard = document.getElementById("accountCard");

let db;
let auth;

if (!state.useLocalMode) {
  const app = initializeApp(window.__FIREBASE_CONFIG__);
  db = getFirestore(app);
  auth = getAuth(app);
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

postStoryBtn.addEventListener("click", () => {
  if (!state.user) {
    authDialog.showModal();
    return;
  }
  storyDialog.showModal();
});

googleLoginBtn.addEventListener("click", async () => {
  if (state.useLocalMode) {
    mockLogin();
    authDialog.close();
    return;
  }

  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
  authDialog.close();
});

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = document.getElementById("profilePassword").value.trim();
  const bio = document.getElementById("profileBio").value.trim();
  if (!password) return;

  if (state.useLocalMode) {
    state.profile = { ...state.profile, password, bio };
    localStorage.setItem("kh_profile", JSON.stringify(state.profile));
    profileDialog.close();
    renderAccount();
    return;
  }

  await setDoc(doc(db, "profiles", state.user.uid), {
    uid: state.user.uid,
    email: state.user.email,
    photoURL: state.user.photoURL || "",
    password,
    bio,
  });

  profileDialog.close();
  await loadProfile();
  renderAccount();
});

storyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = document.getElementById("storyTitle").value.trim();
  const content = document.getElementById("storyContent").value.trim();
  if (!title || !content) return;

  if (state.useLocalMode) {
    const stories = JSON.parse(localStorage.getItem("kh_stories") || "[]");
    stories.push({
      title,
      content,
      author: state.user.email,
      uid: state.user.uid,
      createdAt: Date.now(),
    });
    localStorage.setItem("kh_stories", JSON.stringify(stories));
    state.stories = stories.sort((a, b) => b.createdAt - a.createdAt);
    renderStories();
  } else {
    await addDoc(collection(db, "stories"), {
      title,
      content,
      uid: state.user.uid,
      authorEmail: state.user.email,
      createdAt: serverTimestamp(),
    });
  }

  storyForm.reset();
  storyDialog.close();
});

cancelStoryBtn.addEventListener("click", () => {
  storyDialog.close();
});

function formatDate(value) {
  if (!value) return "à l'instant";
  const timestamp = value.seconds ? value.seconds * 1000 : value;
  return new Date(timestamp).toLocaleString("fr-FR");
}

function storyTemplate(story) {
  return `
    <article class="story-card">
      <h3>${escapeHtml(story.title)}</h3>
      <p class="story-meta">Par ${escapeHtml(story.authorEmail || story.author)} · ${formatDate(
    story.createdAt,
  )}</p>
      <p>${escapeHtml(story.content).replace(/\n/g, "<br>")}</p>
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
  const mine = state.user ? state.stories.filter((s) => s.uid === state.user.uid) : [];
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
      <img src="${state.user.photoURL || "https://placehold.co/120x120"}" alt="Photo de profil" />
      <div>
        <p><strong>Email / Nom:</strong> ${escapeHtml(state.user.email || "Utilisateur")}</p>
        <p><strong>Mot de passe (site):</strong> ${escapeHtml(password)}</p>
      </div>
    </div>
    <p><strong>Bio:</strong> ${escapeHtml(bio)}</p>
  `;
}

function escapeHtml(value) {
  const p = document.createElement("p");
  p.textContent = value;
  return p.innerHTML;
}

async function loadProfile() {
  if (!state.user) return;

  if (state.useLocalMode) {
    state.profile = JSON.parse(localStorage.getItem("kh_profile") || "null");
    if (!state.profile?.password) profileDialog.showModal();
    renderAccount();
    return;
  }

  const ref = doc(db, "profiles", state.user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists() || !snap.data().password) {
    state.profile = null;
    profileDialog.showModal();
  } else {
    state.profile = snap.data();
  }
  renderAccount();
}

function subscribeStories() {
  if (state.useLocalMode) {
    state.stories = JSON.parse(localStorage.getItem("kh_stories") || "[]").sort(
      (a, b) => b.createdAt - a.createdAt,
    );
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

function mockLogin() {
  state.user = {
    uid: "local-user",
    email: "demo@gmail.com",
    photoURL: "https://placehold.co/120x120/1f2a56/ffffff?text=KH",
  };
  state.profile = JSON.parse(localStorage.getItem("kh_profile") || "null");
  if (!state.profile?.password) profileDialog.showModal();
  renderAccount();
  renderStories();
}

function initAuth() {
  if (state.useLocalMode) {
    renderAccount();
    subscribeStories();
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    state.user = user;
    await loadProfile();
    renderStories();
  });

  subscribeStories();
}

initAuth();
