const form = document.getElementById("searchForm");
const input = document.getElementById("searchInput");
const resultsPanel = document.getElementById("resultsPanel");
const quickSearches = document.querySelectorAll("[data-query]");

const resultTypes = [
  {
    title: "Tous les résultats Google",
    description: "Ouvre la page Google complète pour cette recherche.",
    path: "search",
  },
  {
    title: "Images Google",
    description: "Explore les images liées à ta recherche.",
    path: "images",
  },
  {
    title: "Vidéos Google",
    description: "Trouve rapidement des vidéos avec Google.",
    path: "videos",
  },
  {
    title: "Actualités Google",
    description: "Lis les articles récents proposés par Google.",
    path: "news",
  },
];

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (!query) return;
  renderResults(query);
});

quickSearches.forEach((button) => {
  button.addEventListener("click", () => {
    input.value = button.dataset.query;
    renderResults(button.dataset.query);
    input.focus();
  });
});

function renderResults(query) {
  const safeQuery = escapeHtml(query);
  const googleUrl = buildGoogleUrl(query, "search");

  resultsPanel.innerHTML = `
    <div class="results-head">
      <div>
        <p class="eyebrow">Résultats copiés en façade</p>
        <h2>Recherche : ${safeQuery}</h2>
        <p class="muted">K-Global garde l'interface ici, mais les clics partent vers Google.</p>
      </div>
      <a class="google-pill" href="${googleUrl}">Voir dans Google</a>
    </div>
    <div class="result-list">
      ${resultTypes.map((result) => resultTemplate(result, query)).join("")}
    </div>
    <div class="return-note">
      <strong>Pour revenir :</strong> quand tu es sur Google, clique sur le bouton retour de ton navigateur pour retrouver cette page K-Global.
    </div>
  `;
}

function resultTemplate(result, query) {
  const url = buildGoogleUrl(query, result.path);
  return `
    <a class="result-card" href="${url}">
      <span class="result-source">google.com</span>
      <h3>${escapeHtml(result.title)}</h3>
      <p>${escapeHtml(result.description)}</p>
      <span class="result-action">Entrer dans Google →</span>
    </a>
  `;
}

function buildGoogleUrl(query, type) {
  const params = new URLSearchParams({ q: query });

  if (type === "images") {
    params.set("tbm", "isch");
  }

  if (type === "videos") {
    params.set("tbm", "vid");
  }

  if (type === "news") {
    params.set("tbm", "nws");
  }

  return `https://www.google.com/search?${params.toString()}`;
}

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}
