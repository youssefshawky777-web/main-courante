# Main courante — mise en ligne et installation

> ## Nouveau : version 4
>
> **Pour passer à la v4 :** GitHub → dossier `main-courante-app` → **Add file → Upload files** : `app.js`, `index.html`, `styles.css`, `sw.js`, `README.md` → *Commit changes*. Puis ferme et rouvre l'appli sur le téléphone. Pas de nouveau script SQL (si la v3 n'est pas encore passée, exécute `supabase-v3.sql`).
>
> - **Barre en bas sur téléphone** : Accueil + tes 3 premières pages + « Toutes » (toutes les pages, Bilan, Réglages, Nouvelle page). L'ordre se change dans Réglages → Pages.
> - **Récurrentes** (Budget → Modifier la page) : loyer, abonnements, bourse, épargne… ajoutés tout seuls le jour choisi chaque mois.
> - **Sommeil et énergie** dans Ma journée, avec la comparaison automatique « après une nuit de sécu / les autres jours ».
> - **Pomodoro** (25/5, pause longue toutes les 4) à côté du chrono : bip + vibration, temps ajouté tout seul. Durées réglables dans Ma journée → Modifier la page.
> - **Bilan du mois** (bouton sur le tableau de bord) : boulots, budget, journée, objectifs, fac, révisions, sport, lectures… avec **Imprimer / PDF**.
> - **Partiels à venir** dans Révisions : compte à rebours, révisions prévues ou en retard par matière, et « révision générale » à ajouter la veille. Un partiel est repéré dans Fac (type Partiel, ou titre avec partiel/examen/CC/DS) ou dans l'Agenda.


> ## Version 3 (journée, objectifs, agenda, révisions…)
>
> **Pour passer à la v3 (3 étapes) :**
> 1. Supabase → **SQL Editor** → *New query* → colle tout `supabase-v3.sql` → **Run** (*Success*). Il contient aussi la v2.
> 2. GitHub → dossier `main-courante-app` → **Add file → Upload files** : `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, `README.md`, `supabase-v3.sql` → *Commit changes*.
> 3. Téléphone : ferme complètement l'appli et rouvre-la (2 fois si besoin). Sur le tableau de bord, touche **Ajouter les pages cochées**.
>
> **Les nouvelles pages** (chacune se renomme, se réordonne ou se supprime comme les autres)
> - **Ma journée** : citation du jour ; to-do *À faire absolument / Si j'ai le temps / Pour me reposer après* (↪ reporte à demain) ; humeur ; productivité 1–5 ; temps de travail (+15 min, +30 min, +1 h ou **chrono**) ; mini-bilan + point positif ; calendrier du mois coloré par humeur et graphique du temps de travail. À droite : agenda, révisions, « très important » et pense-bête du jour.
> - **Objectifs** : jour / semaine / mois / année, ★ = *très important cette semaine*, ↪ reporte à la période suivante, « reprendre les non atteints » ; **bilan de la semaine** automatique.
> - **Agenda** : emploi du temps (créneaux qui reviennent chaque semaine, avec dates de validité) + planning (événements datés), grille de la semaine, export vers le calendrier du téléphone.
> - **À ne pas oublier** : liste à cocher avec date facultative. Le modèle « Liste à cocher » sert aussi pour les courses, les idées…
> - **Révisions (méthode des J)** : matière, chapitre, J0 → J1, J3, J7, J14, J30 (modifiable). « À revoir aujourd'hui », pastilles colorées, charge des 7 prochains jours.
> - **Lectures** : titre, auteur, référence, dates, note ★, notes perso ; compteur de l'année et objectif.
> - **Liens & notes** : applis, sites et notes utiles par catégorie, avec recherche.
> - **Budget** : nouveau sens **Épargne**, « Libellé » devient **Description**, camembert des dépenses, graphique 6 mois, taux d'épargne, paies des Boulots comptées dans les revenus (réglable).
>
> Les citations perso se règlent dans *Ma journée → Modifier la page*.


> ## Version 2 (pages modifiables)
>
> **Pour passer à la v2 (3 étapes, 5 minutes) :**
> 1. Supabase → **SQL Editor** → *New query* → colle tout `supabase-v2.sql` → **Run** (*Success*).
> 2. Sur GitHub, ré-uploade `app.js`, `index.html`, `styles.css`, `sw.js` et ajoute `supabase-v2.sql` (**Add file → Upload files**, puis *Commit changes*).
> 3. Sur le téléphone : ferme complètement l'appli et rouvre-la (2 fois si besoin).
>
> Tes entrées sont gardées. Au premier lancement, tes 4 onglets deviennent des pages modifiables.
>
> **Ce qui change**
> - **Pages** : bouton **＋ Page** dans les onglets ; **Modifier la page** en bas de chaque page ; ordre, archivage et suppression dans **Réglages → Pages**. Quatre modèles : journal daté, tâches à échéance, argent, habitude.
> - **Modifier une entrée** : ✎ sur la ligne (✕ pour supprimer, 2 touches).
> - **Modèles rapides** : remplis le formulaire → « Enregistrer ces valeurs comme modèle rapide ». Ensuite un tap sur le bouton ajoute l'entrée à la date du jour (avec *Annuler*).
> - **Taux horaire** : dans *Modifier la page* de Boulots, mets ton €/h par boulot ; le montant se calcule quand tu tapes les heures.
> - **Objectifs du mois** : dans *Modifier la page* (ex. Dépenses · Sorties au plus 80 €). Jauges sur le tableau de bord.
> - **Rappels** : bandeau en haut pour ce qui tombe aujourd'hui/demain ; 📅 sur une tâche, ou *Réglages → Rappels*, pour l'ajouter à l'agenda du téléphone (alerte la veille à 18 h et 7 jours avant).
> - **Recherche** : barre de recherche + filtre sur chaque page (tous mois confondus), et recherche globale sur le tableau de bord.
> - **Export CSV** (Excel/Numbers) : en bas de chaque page (mois ou tout) et *Réglages → Export*.
> - **Photo de ticket** : champ « Ticket » dans Budget (ajoutable à n'importe quelle page via le type de champ *Photo*). Photos privées, compressées.
> - **Face ID / empreinte** : *Réglages → Code PIN* une fois le PIN activé.


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
| `supabase-v2.sql` | Ajoute les pages modifiables et le stockage des photos (v2) |

---

## Étape 1 — Créer la base (Supabase)

1. Va sur **supabase.com** → *Start your project*. Crée un compte (le plus simple : avec GitHub, voir étape 2).
2. **New project** :
   - Nom : `main-courante`
   - Database password : un mot de passe solide (garde-le, mais l'appli n'en a pas besoin)
   - Région : **West EU (Paris)** si proposée, sinon une région Europe
   - Plan : **Free**
3. Attends 1 à 2 minutes que le projet soit prêt.
4. Menu de gauche → **SQL Editor** → *New query*. Colle tout le contenu de `supabase.sql` → **Run**. Tu dois voir *Success*. Refais pareil avec `supabase-v2.sql`.
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
2. Dans `sw.js`, change la ligne `const VERSION = 'mc-v2';` en `'mc-v3'` (puis v4, etc.).
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
