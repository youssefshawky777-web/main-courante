# Main courante — mise en ligne et installation

Appli perso installable sur ton téléphone : boulots, fac, sport & tir, budget.
Connexion par adresse mail + mot de passe, puis code PIN sur ton téléphone.
Tes données sont dans ta base Supabase, synchronisées entre téléphone et ordi.

Coût : 0 €. Temps : environ 30 minutes la première fois.

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `index.html` | La page de l'appli |
| `app.js` | Toute la logique (connexion, PIN, saisie, tableau de bord) |
| `styles.css` | Le design |
| `config.js` | **À remplir** avec les deux valeurs de ton projet Supabase |
| `manifest.webmanifest`, `sw.js`, `icons/` | Ce qui rend l'appli installable et utilisable hors réseau |
| `supabase.sql` | Le script qui crée la base et ses règles de sécurité |

---

## Étape 1 — Créer la base (Supabase)

1. Va sur **supabase.com** → *Start your project*. Crée un compte (le plus simple : avec GitHub, voir étape 2).
2. **New project** :
   - Nom : `main-courante`
   - Database password : un mot de passe solide (garde-le, mais l'appli n'en a pas besoin)
   - Région : **West EU (Paris)** si proposée, sinon une région Europe
   - Plan : **Free**
3. Attends 1 à 2 minutes que le projet soit prêt.
4. Menu de gauche → **SQL Editor** → *New query*. Colle tout le contenu de `supabase.sql` → **Run**. Tu dois voir *Success*.
5. Récupère tes deux valeurs avec le bouton **Connect** en haut du projet (ou *Settings → API Keys*) :
   - **Project URL** : `https://xxxxxxxx.supabase.co`
   - **Publishable key** : commence par `sb_publishable_…`
6. Ouvre `config.js` avec un éditeur de texte et remplace les deux valeurs :

```js
window.MC_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_xxxxxxxxxxxx"
};
```

> Cette clé est faite pour être visible. Ce qui protège tes données, ce sont les règles du script SQL : chaque compte ne lit et ne modifie que ses propres entrées.
> Ne mets **jamais** la clé *secret* (`sb_secret_…`) ni l'ancienne `service_role` dans ce fichier.

## Étape 2 — Mettre l'appli en ligne (GitHub Pages)

1. Crée un compte sur **github.com** si tu n'en as pas.
2. **New repository** :
   - Nom : `main-courante`
   - **Public** (obligatoire pour GitHub Pages gratuit — seul le code est visible, pas tes données)
   - *Create repository*
3. Sur la page du dépôt : **Add file → Upload files**. Glisse **le contenu** du dossier (les fichiers et le dossier `icons`, pas le dossier parent). → **Commit changes**.
4. **Settings → Pages** :
   - Source : *Deploy from a branch*
   - Branch : `main` / `(root)` → **Save**
5. Attends 1 à 2 minutes. L'adresse de ton appli s'affiche en haut de la page Pages :
   `https://TON-PSEUDO.github.io/main-courante/`

## Étape 3 — Relier l'adresse à Supabase

Pour que les liens des mails (confirmation, mot de passe oublié) ramènent dans ton appli :

1. Supabase → **Authentication → URL Configuration**
2. **Site URL** : `https://TON-PSEUDO.github.io/main-courante/`
3. **Redirect URLs** → *Add URL* : la même adresse → *Save*

## Étape 4 — Installer sur ton téléphone

**iPhone (Safari obligatoire)**
1. Ouvre l'adresse de ton appli dans Safari.
2. Bouton **Partager** (carré avec flèche) → **Sur l'écran d'accueil** → *Ajouter*.

**Android (Chrome)**
1. Ouvre l'adresse dans Chrome.
2. Menu **⋮** → **Installer l'application** (ou *Ajouter à l'écran d'accueil*).

L'icône « MC » apparaît sur ton écran d'accueil. L'appli s'ouvre en plein écran, sans barre de navigateur.

## Étape 5 — Premier lancement

1. Ouvre l'appli → **Créer un compte** avec ton adresse mail et un mot de passe (8 caractères min.).
2. Clique le lien du mail de confirmation, puis reviens te connecter.
3. **Réglages → Activer un code PIN** : 4 à 6 chiffres.
   Ensuite, l'appli demande le PIN à l'ouverture et après 2 minutes en arrière-plan.
   PIN oublié : touche « Utiliser mon mot de passe » et reconnecte-toi.

Le PIN est propre à chaque appareil : sur l'ordi, tu peux en mettre un autre, ou aucun.

---

## Mettre à jour l'appli

1. Modifie le fichier sur GitHub (icône crayon) ou ré-uploade-le.
2. Dans `sw.js`, change la ligne `const VERSION = 'mc-v1';` en `'mc-v2'` (puis v3, etc.).
   Sans ça, le téléphone peut garder l'ancienne version en cache.
3. Ferme complètement l'appli sur le téléphone et rouvre-la.

## Sauvegarde

**Réglages → Télécharger une copie** : un fichier JSON avec toutes tes entrées.
Tes données restent aussi dans Supabase (*Table Editor → entries*).

## Dépannage

| Problème | Solution |
|---|---|
| « Appli pas encore reliée à Supabase » | `config.js` n'est pas rempli, ou l'ancienne version est en cache : vérifie le fichier sur GitHub, puis recharge. |
| « Adresse ou mot de passe incorrect » alors que tout est bon | Le compte n'est pas confirmé : clique le lien du mail de confirmation. |
| Le mail de confirmation n'arrive pas | Regarde les spams. Le plan gratuit limite le nombre de mails par heure : patiente un peu. |
| Le lien du mail ouvre une page d'erreur | Étape 3 pas faite, ou adresse différente (attention au `/` final). |
| Pas d'option « Installer » sur iPhone | Il faut ouvrir l'adresse dans **Safari**, pas dans Chrome ni dans Instagram. |
| Un ajout ne passe pas | Pas de réseau : l'appli s'ouvre hors connexion pour consulter, mais l'enregistrement demande internet. |
| Supabase a mis le projet en pause | Le plan gratuit met en pause un projet inactif après environ une semaine. Supabase → *Restore project*. Utiliser l'appli régulièrement évite la pause. |
