# Khalil's Histoire

Application web en français pour publier des histoires avec une ambiance spatiale nébuleuse.

## Fonctionnalités (nouvelle logique)

- **Plus de bouton de connexion en haut** : en haut il y a seulement **Poster une histoire**.
- Si vous cliquez sur **Poster une histoire** sans être connecté, la fenêtre de connexion s'ouvre.
- Connexion et création de compte avec **pseudo + mot de passe** uniquement.
- **Accueil** : toutes les histoires de tous les comptes (synchro globale en temps réel avec Firebase).
- **Mon compte** : pseudo, mot de passe, bio, déconnexion + affichage des histoires personnelles.
- **Mes histoires** : filtre des histoires publiées par le compte connecté.
- **J'aime** : 1 like par compte et par histoire (clic = like/unlike).
- **Suppression** : un utilisateur peut supprimer **uniquement ses propres histoires** via un bouton `X` + confirmation.
- Après publication d'une histoire, un emoji **🎉** s'affiche pendant **0,70 seconde**.

## Synchronisation Firebase

Quand la configuration Firebase est fournie, tous les comptes voient les mêmes histoires et les mêmes likes en temps réel.

Ajoutez la config dans `index.html`:

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

Collections Firestore utilisées:

- `profiles` (profil pseudo/mot de passe/bio)
- `stories` (histoires + likedBy)

## Lancer localement

```bash
python3 -m http.server 4173
```

Puis ouvrez `http://localhost:4173`.

> Sans Firebase, l'app fonctionne en localStorage (démonstration locale uniquement).
