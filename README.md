# Khalil's Histoire

Application web en français pour publier des histoires avec une ambiance spatiale nébuleuse.

## Fonctionnalités

- **Connexion sans Gmail**: uniquement avec **pseudo + mot de passe**.
- **Accueil**: affiche toutes les histoires des utilisateurs en temps réel.
- **Mon compte**: pseudo, mot de passe, bio, bouton déconnexion.
- **Mes histoires**: seulement les histoires publiées par l'utilisateur connecté.
- Bouton **Poster une histoire** en haut:
  - si non connecté, affiche la connexion,
  - si connecté, ouvre directement le formulaire.
- **J'aime**: chaque utilisateur peut mettre/enlever son like une seule fois par histoire.

## Synchronisation entre appareils

- En mode Firebase, toutes les histoires et les likes sont synchronisés en temps réel entre tous les comptes et tous les appareils.
- Si vous ouvrez le site sur téléphone, vous verrez aussi les histoires postées ailleurs.

## Lancer localement

```bash
python3 -m http.server 4173
```

Puis ouvrez `http://localhost:4173`.

## Configuration Firebase (recommandé pour la synchro multi-appareils)

Pour activer la synchronisation en temps réel globale, ajoutez votre config Firebase dans `index.html`:

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

Ensuite, créez dans Firestore:

- collection `profiles` (comptes pseudo/mot de passe),
- collection `stories` (histoires + likes).

> Sans Firebase, l'app fonctionne en mode local (`localStorage`) mais la synchronisation sera limitée au navigateur local.
