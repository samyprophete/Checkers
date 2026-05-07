# CORE LOGIC - CONTRAT D'ARCHITECTURE (JEU DE DAMES)
**NE JAMAIS MODIFIER, SIMPLIFIER OU CASSER CETTE LOGIQUE DE BASE.**

Ce fichier contient les règles absolues de l'architecture actuelle de `engine.js` et `ui.js`. Le moteur de jeu a été entièrement réinitialisé et stabilisé. Il tourne maintenant à la perfection sans blocage ("freeze").

Toute évolution future (design, GSAP anims, refactoring) DOIT impérativement respecter les axiomes suivants :

## 1. Mouvements et Rafles (`engine.js`)
*   **Axiome 1 : Mouvement Simple et Prise.** Les pions avancent en diagonale. Ils capturent en sautant par dessus une pièce ennemie pour atterrir sur une case vide. Les prises en arrière pour les pions normaux sont autorisées (règle internationale).
*   **Axiome 2 : Dames Volantes.** Les Dames peuvent glisser (mouvement simple) et capturer (voler) sur toute la longueur d'une diagonale vide. Elles peuvent atterrir sur **n'importe quelle case vide** après avoir sauté une pièce ennemie, tant que la diagonale est libre.
*   **Axiome 3 : Rafles (Sauts Multiples).** Les sauts s'enchaînent tant qu'il y a des prises possibles. La gestion des rafles se fait via `mustContinueRafle` (qui stocke la case de la pièce en cours de saut). Le tour du joueur ne passe à l'adversaire que si `mustContinueRafle` redevient `null`.
*   **Axiome 4 : Pas de Prise Majoritaire Stricte.** Bien que la prise soit obligatoire (`return captures.length > 0 ? captures : simples`), le moteur *ne force pas* l'arbre complexe de la prise majoritaire absolue (qui cassait le jeu). Il renvoie simplement tous les chemins de prise valides.
*   **Axiome 5 : Ascension Immédiate.** Lorsqu'un pion atteint la rangée de promotion, il devient Dame **immédiatement** (règle russe/brésilienne) et peut poursuivre sa rafle dans la même séquence s'il a d'autres prises possibles en tant que Dame.
*   **Axiome 6 : Pièces Mangées "Fantômes".** Durant une rafle, les pièces sautées sont enregistrées dans le tableau d'état `capturedSoFar` mais ne sont retirées du vrai plateau `board` qu'à **la toute fin** de la rafle (pour empêcher de sauter 2 fois la même pièce).

## 2. Interface et Contrôle (`ui.js`)
*   **Axiome 7 : Calcul Prédictif des Chemins (`getAllPaths`).** L'interface calcule récursivement l'arbre de *toutes* les destinations finales et chemins de rafles possibles dès le clic sur une pièce.
*   **Axiome 8 : Clics Fluides ("Sequence Execution").** L'UI permet à l'utilisateur de cliquer sur *n'importe quel nœud* du chemin surligné. La fonction `executeSequence` déroulera automatiquement les animations pour chaque étape intermédiaire jusqu'à la destination cliquée, sans bloquer l'interface.
*   **Axiome 9 : Masquage visuel des captures.** `renderBoard` lit `state.capturedSoFar` pour empêcher l'affichage des tuiles capturées au milieu d'une rafle en cours, même si elles sont encore techniquement sur `state.board` dans le moteur.

## 3. IA (`ai.js`)
*   **Axiome 10 : IA Robuste.** L'IA utilise une sélection robuste sur `getLegalMoves`. Aucune logique (comme Minimax) réintroduite ne doit faire exploser l'arbre d'état avec les Dames volantes au point de faire crasher/friser le navigateur.

---
**CONSIGNE POUR L'ASSISTANT:**
Je comprends ce contrat. Mon objectif est d'ajouter de nouvelles fonctionnalités (UI, animations avancées, etc.) de manière chirurgicale, sans perturber la structure des données générées par `getLegalMoves`, `applyMove` et `executeSequence`.
