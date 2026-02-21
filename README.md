# Khalil's Histoire

Application web en français pour publier des histoires avec une ambiance spatiale nébuleuse.

## Fonctionnalités (nouvelle logique)

- **Plus de bouton de connexion en haut** : en haut il y a seulement **Poster une histoire**.
- Si vous cliquez sur **Poster une histoire** sans être connecté, la fenêtre de connexion s'ouvre.
- Connexion et création de compte avec **pseudo + mot de passe** uniquement.
- **Accueil** : toutes les histoires de tous les comptes (synchro globale en temps réel avec Firebase).
- **Mon compte** : pseudo, mot de passe, bio, déconnexion + affichage des histoires personnelles.
- **Mes histoires** : filtre des histoires publiées par le compte connecté.
- **J'aime** : un simple emoji ❤️ (sans compteur), qui devient rouge au clic ; 1 like par compte et par histoire.
- **Suppression** : un utilisateur peut supprimer **uniquement ses propres histoires** via un bouton `X` + confirmation.
- **Compte auteur volontaire** : si vous tentez `KTB` / `MY`, un bouton `Ou bien être volontaire` apparaît.
  - Question: `Quelle est la métier de tes rêves ?`
  - Réponse attendue: commence par `Astronaute de la mer` (texte additionnel accepté).
  - Si correct: message `Bienvenue, auteur` et droits de modération (suppression de toutes les histoires + vider les likes).
- Après publication d'une histoire, un emoji **🎉** s'affiche pendant **0,70 seconde**.

## Réinitialisation des anciennes histoires

- Le site redémarre sur une nouvelle base d'histoires (collection `stories_fresh_start` et stockage local `kh_stories_fresh_start`).
- Les anciennes histoires ne sont plus chargées dans cette nouvelle version.

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
- `stories_fresh_start` (histoires + likedBy)

## Lancer localement

```bash
python3 -m http.server 4173
```

Puis ouvrez `http://localhost:4173`.

> Sans Firebase, l'app fonctionne en localStorage (démonstration locale uniquement).


## Licence

- Contact/licence: `inconnudesasc@gmail.com`
