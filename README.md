# Khalil's Histoire

Application web en français pour publier des histoires avec une ambiance spatiale nébuleuse.

## Fonctionnalités

- **Accueil**: affiche toutes les histoires des utilisateurs (temps réel via Firestore).
- **Mon compte**: photo de profil, email Google, mot de passe du site et bio.
- **Mes histoires**: seulement les histoires publiées par l'utilisateur connecté.
- Bouton **Poster une histoire** en haut:
  - si non connecté, demande "Connectez-vous" avec Google,
  - si connecté, ouvre directement le formulaire de publication.

## Lancer localement

Comme c'est un site statique:

```bash
python3 -m http.server 4173
```

Puis ouvrez `http://localhost:4173`.

## Configuration Firebase (mode réel)

Par défaut, si aucune configuration Firebase n'est fournie, l'app passe en **mode local de démonstration** (localStorage).

Pour activer l'auth Google + Firestore en temps réel, remplacez la config dans `index.html`:

```html
<script>
  window.__FIREBASE_CONFIG__ = {
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
  };
</script>
```

Ensuite, configurez dans Firebase:

- Authentification Google,
- Firestore avec collections `stories` et `profiles`.

> ⚠️ Note: le champ "mot de passe du site" est stocké tel quel pour respecter la demande fonctionnelle. En production, il faudrait le traiter de façon sécurisée (hash + règles strictes).
