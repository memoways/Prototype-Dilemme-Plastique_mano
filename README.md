# 🌊 Dilemme Plastique

> Application éducative interactive française pour sensibiliser les jeunes (10-18 ans) et les enseignants aux enjeux de la pollution plastique et son impact sur la santé.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue)
![React](https://img.shields.io/badge/React-18.3.1-61dafb)

---

## 📋 Table des matières

- [À propos](#-à-propos)
- [Caractéristiques principales](#-caractéristiques-principales)
- [Architecture technique](#-architecture-technique)
- [Technologies utilisées](#-technologies-utilisées)
- [Structure du projet](#-structure-du-projet)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Utilisation](#-utilisation)
- [Performance](#-performance)
- [Développement](#-développement)
- [Contribuer](#-contribuer)
- [Licence](#-licence)

---

## 🎯 À propos

**Dilemme Plastique** est une application web éducative qui propose une expérience d'apprentissage immersive sur la pollution plastique. À travers des conversations avec **Peter**, un guide écologique doté d'intelligence artificielle, les utilisateurs explorent des scénarios concrets, visualisent des contenus multimédias et découvrent des solutions applicables au quotidien.

### Objectifs pédagogiques

- 🧠 Comprendre l'impact du plastique sur la santé humaine
- 🌍 Découvrir les enjeux environnementaux liés au plastique
- 💡 Identifier des solutions concrètes et applicables
- 🎓 Développer une pensée critique sur la consommation de plastique

### Public cible

- **Élèves** : 10-18 ans (collège et lycée)
- **Enseignants** : Support pédagogique pour cours de SVT, géographie, éducation civique
- **Durée de session** : 20-30 minutes

---

## ✨ Caractéristiques principales

### 🤖 Assistant conversationnel "Peter"

- Chatbot alimenté par **Flowise AI** avec mémoire conversationnelle
- Dialogue naturel en français
- Scénarios interactifs basés sur des situations réelles
- Système d'indices pour guider l'apprentissage
- Reconnaissance vocale via **OpenAI Whisper** (français)

### 📱 Interface split-screen innovante

```
┌─────────────────────────────────────────────┐
│  Chat (1/3)      │   Panneau Média (2/3)    │
│                  │                           │
│  Conversation    │   - Vidéos YouTube        │
│  avec Peter      │   - Lecteur Gumlet        │
│                  │   - Articles web          │
│                  │   - Ressources externes   │
└─────────────────────────────────────────────┘
```

- **Zone de chat** : Interface de conversation fluide et responsive
- **Panneau média** : Affichage synchronisé de contenus multimédias
- Défilement indépendant entre chat et média
- Toujours visible (pas de fermeture)

### 🎬 Intégration multimédia avancée

- **Lecteur vidéo Gumlet** : Lecture fluide sans distractions
- **Vidéos YouTube** : Intégration propre sans suggestions ni overlays
- **Webview in-app** : Articles externes affichés sans quitter l'application
- **Proxy CORS** : Contournement des restrictions X-Frame-Options

### 📊 Suivi de progression

- Tableau de bord avec thématique, indices trouvés et score global
- Effet confetti lors de la découverte d'indices
- Analytics anonymes avec **Rectify** (project ID: 67fa3feb2c561c2729b9fc5d)

### 🎨 Design et UX

- Couleur principale : Vert teal `#14B8A7` (cohérence visuelle)
- Interface 100% en français
- Design optimisé pour desktop (min. 1024px)
- Accessibilité WCAG 2.1 AA
- Composants UI modernes avec **shadcn/ui** et **Radix UI**

---

## 🏗️ Architecture technique

### Schéma général

```
┌─────────────────────────────────────────────────────────────────────┐
│                          UTILISATEUR                                 │
│                     (Desktop > 1024px)                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                           │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │  Components                                                      │ │
│ │  ├── ChatInterface        (Interface de conversation)           │ │
│ │  ├── MediaPanel           (Vidéos + Webview)                    │ │
│ │  ├── ConfettiEffect       (Animations)                          │ │
│ │  └── RectifyWidget        (Analytics)                           │ │
│ │                                                                  │ │
│ │  Hooks                                                           │ │
│ │  ├── use-flowise          (Communication chatbot)               │ │
│ │  ├── use-media-panel      (Gestion média)                       │ │
│ │  └── use-mobile           (Responsive)                          │ │
│ │                                                                  │ │
│ │  Pages                                                           │ │
│ │  ├── Homepage             (Accueil + Chat)                      │ │
│ │  ├── About                (À propos)                            │ │
│ │  └── NotFound             (404)                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTP/REST API
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express.js)                              │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │  Routes API                                                      │ │
│ │  ├── /api/flowise/prediction/:chatflowId                        │ │
│ │  │   └─ Proxy sécurisé vers Flowise                            │ │
│ │  │   └─ Cache en mémoire (5 min TTL)                           │ │
│ │  │   └─ Parsing JSON optimisé                                  │ │
│ │  │                                                              │ │
│ │  ├── /api/transcribe                                            │ │
│ │  │   └─ Speech-to-text (OpenAI Whisper)                        │ │
│ │  │   └─ Support audio WebM/MP3                                 │ │
│ │  │                                                              │ │
│ │  ├── /api/proxy                                                 │ │
│ │  │   └─ Proxy CORS pour webview                                │ │
│ │  │   └─ Suppression X-Frame-Options                            │ │
│ │  │                                                              │ │
│ │  └── /api/analytics                                             │ │
│ │      └─ Collecte événements anonymes                           │ │
│ │                                                                  │ │
│ │  Middleware                                                      │ │
│ │  ├── Helmet            (Sécurité headers)                       │ │
│ │  ├── Compression       (Gzip)                                   │ │
│ │  ├── Rate Limiting     (Protection DDoS)                        │ │
│ │  └── Session           (In-memory store)                        │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└────────────────┬───────────────────┬────────────────────────────────┘
                 │                   │
                 │                   │
    ┌────────────▼─────────┐  ┌──────▼──────────────┐
    │   FLOWISE API        │  │  OpenAI Whisper API │
    │   (Chatbot IA)       │  │  (Speech-to-Text)   │
    │                      │  │                     │
    │  - Conversations     │  │  - Transcription    │
    │  - Context memory    │  │  - Langue: Français │
    │  - JSON responses    │  │  - Format: JSON     │
    └──────────────────────┘  └─────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   SERVICES EXTERNES                                  │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   Gumlet     │  │   YouTube    │  │   Rectify Analytics      │  │
│  │   (Vidéos)   │  │   (Vidéos)   │  │   (Tracking anonyme)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Flux de données principal

1. **Utilisateur envoie un message** → Frontend (`ChatInterface`)
2. **Hook `use-flowise`** → Appel API `/api/flowise/prediction/:chatflowId`
3. **Backend Express** → Vérification cache → Requête à Flowise API
4. **Flowise retourne JSON** → Parsing serveur → Extraction `Response`, `URL`, `URLYOUTUBE`, etc.
5. **Frontend reçoit réponse** → Parsing client → Extraction médias (vidéos, liens)
6. **Affichage message** → Si vidéo/lien → Ouverture dans `MediaPanel`
7. **Analytics** → Tracking événement (non-bloquant, async)

### Architecture de stockage

```
┌─────────────────────────────────────────────┐
│          STOCKAGE IN-MEMORY                 │
│                                             │
│  ├── Flowise Cache (Map)                   │
│  │   └─ TTL: 5 minutes                     │
│  │   └─ Cleanup: 1 minute                  │
│  │                                          │
│  ├── Session Store (memorystore)           │
│  │   └─ Sessions utilisateur               │
│  │   └─ ChatId unique par session          │
│  │                                          │
│  └── Analytics Buffer                      │
│      └─ Événements avant envoi Rectify     │
└─────────────────────────────────────────────┘
```

> **Note** : Aucune base de données persistante n'est utilisée. Le projet privilégie le stockage en mémoire pour une expérience éducative sans compte utilisateur.

---

## 🛠️ Technologies utilisées

### Frontend

| Technologie | Version | Usage |
|------------|---------|-------|
| **React** | 18.3.1 | Framework UI |
| **TypeScript** | 5.6.3 | Typage statique |
| **Vite** | 5.4.19 | Build tool & dev server |
| **Tailwind CSS** | 3.4.17 | Styles utilitaires |
| **Wouter** | 3.3.5 | Routing léger |
| **shadcn/ui** | - | Composants UI (Radix) |
| **Framer Motion** | 11.13.1 | Animations |
| **TanStack Query** | 5.60.5 | Gestion état serveur |
| **React Hook Form** | 7.55.0 | Formulaires |
| **Zod** | 3.24.2 | Validation schémas |

### Backend

| Technologie | Version | Usage |
|------------|---------|-------|
| **Express.js** | 4.21.2 | Serveur HTTP |
| **TypeScript** | 5.6.3 | Typage statique |
| **OpenAI** | 5.15.0 | API Whisper (STT) |
| **Helmet** | 8.1.0 | Sécurité headers |
| **Compression** | 1.8.1 | Gzip compression |
| **Rate Limit** | 8.0.1 | Protection DDoS |
| **Multer** | 2.0.2 | Upload fichiers audio |
| **ws** | 8.18.0 | WebSockets |

### Intégrations externes

- **Flowise** : Plateforme de chatbot IA (API REST)
- **OpenAI Whisper** : Reconnaissance vocale (français)
- **Gumlet** : CDN et lecteur vidéo
- **YouTube** : Vidéos éducatives (embed)
- **Rectify** : Analytics anonymes

---

## 📁 Structure du projet

```
Prototype-Dilemme-Plastique_mano/
├── client/                          # Frontend React
│   ├── src/
│   │   ├── components/              # Composants React
│   │   │   ├── avatar/              # Avatars utilisateur/Peter
│   │   │   ├── chat/                # Interface de conversation
│   │   │   │   ├── ChatInterface.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   └── MessageInput.tsx
│   │   │   ├── effects/             # Effets visuels
│   │   │   │   └── ConfettiEffect.tsx
│   │   │   ├── integrations/        # Widgets externes
│   │   │   │   └── RectifyWidget.tsx
│   │   │   ├── layout/              # Layout principal
│   │   │   │   ├── Header.tsx
│   │   │   │   └── Footer.tsx
│   │   │   ├── media/               # Panneau multimédia
│   │   │   │   ├── MediaPanel.tsx
│   │   │   │   ├── VideoPlayer.tsx
│   │   │   │   └── WebViewPanel.tsx
│   │   │   └── ui/                  # shadcn/ui components
│   │   ├── hooks/                   # Custom hooks
│   │   │   ├── use-flowise.ts       # Communication Flowise
│   │   │   ├── use-media-panel.ts   # Gestion panneau média
│   │   │   ├── use-mobile.tsx       # Détection mobile
│   │   │   └── use-toast.ts         # Notifications
│   │   ├── lib/                     # Utilitaires
│   │   │   ├── analytics.ts         # Tracking Rectify
│   │   │   ├── flowise.ts           # Client Flowise
│   │   │   ├── queryClient.ts       # TanStack Query
│   │   │   └── utils.ts             # Helpers
│   │   ├── pages/                   # Pages principales
│   │   │   ├── homepage.tsx         # Accueil + Chat
│   │   │   ├── about.tsx            # À propos
│   │   │   └── not-found.tsx        # 404
│   │   ├── types/                   # Types TypeScript
│   │   ├── App.tsx                  # Root component
│   │   ├── main.tsx                 # Entry point
│   │   └── index.css                # Styles globaux
│   └── index.html                   # Template HTML
│
├── server/                          # Backend Express
│   ├── index.ts                     # Entry point serveur
│   ├── routes.ts                    # Routes API
│   ├── storage.ts                   # Stockage in-memory
│   └── vite.ts                      # Configuration Vite SSR
│
├── shared/                          # Code partagé
│   └── schema.ts                    # Schémas Zod partagés
│
├── attached_assets/                 # Assets statiques
│   └── Peter Avatar_1756372265537.jpg
│
├── .env                             # Variables d'environnement
├── package.json                     # Dépendances npm
├── tsconfig.json                    # Configuration TypeScript
├── vite.config.ts                   # Configuration Vite
├── tailwind.config.ts               # Configuration Tailwind
├── drizzle.config.ts                # Configuration Drizzle (future DB)
├── CHANGELOG.md                     # Historique des changements
└── README.md                        # Ce fichier
```

---

## 🚀 Installation

### Prérequis

- **Node.js** : >= 20.x
- **npm** : >= 9.x
- **Compte Flowise** : API key + chatflow ID
- **Compte OpenAI** : API key (pour Whisper)

### Étapes d'installation

1. **Cloner le repository**

```bash
git clone https://github.com/memoways/Prototype-Dilemme-Plastique_mano.git
cd Prototype-Dilemme-Plastique_mano
```

2. **Installer les dépendances**

```bash
npm install
```

3. **Configurer les variables d'environnement**

Créez un fichier `.env` à la racine :

```env
# Flowise Configuration
FLOWISE_HOST=https://votre-instance-flowise.com
FLOWISE_CHATFLOW_ID=votre-chatflow-id
FLOWISE_API_KEY=votre-api-key

# OpenAI Configuration (pour Whisper)
OPENAI_API_KEY=votre-openai-api-key

# Frontend Variables (optionnel)
VITE_FLOWISE_CHATFLOW_ID=votre-chatflow-id
```

4. **Lancer le projet en développement**

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5000`

5. **Build pour production**

```bash
npm run build
npm start
```

---

## ⚙️ Configuration

### Variables d'environnement

| Variable | Requis | Description | Exemple |
|----------|--------|-------------|---------|
| `FLOWISE_HOST` | ✅ | URL de votre instance Flowise | `https://flowise.example.com` |
| `FLOWISE_CHATFLOW_ID` | ✅ | ID du chatflow Peter | `abc123def456` |
| `FLOWISE_API_KEY` | ⚠️ | Clé API Flowise (si protégé) | `sk_flowise_...` |
| `OPENAI_API_KEY` | ✅ | Clé API OpenAI (Whisper) | `sk-proj-...` |
| `VITE_FLOWISE_CHATFLOW_ID` | ❌ | Chatflow ID côté client (fallback) | `abc123def456` |

### Configuration Flowise

Pour que Peter fonctionne correctement, votre chatflow Flowise doit :

1. **Retourner un JSON structuré** avec les champs suivants :

```json
{
  "Response": "Message de Peter à afficher",
  "URL": "https://example.com/article",
  "URLYOUTUBE": "https://youtube.com/watch?v=...",
  "theme": "Nom de la thématique",
  "nombre_d_indices": "3",
  "score_globale": 85
}
```

2. **Activer la mémoire conversationnelle** (via `chatId` / `sessionId`)
3. **Configurer en français** pour les réponses

### Configuration Analytics Rectify

Modifiez le project ID dans `client/src/components/integrations/RectifyWidget.tsx` :

```typescript
window.rectifySettings = {
  project: 'VOTRE_PROJECT_ID',
};
```

---

## 💻 Utilisation

### Pour les développeurs

#### Commandes disponibles

```bash
# Développement (hot reload)
npm run dev

# Build production
npm run build

# Démarrer en production
npm start

# Type checking TypeScript
npm run check

# Push DB schema (Drizzle ORM)
npm run db:push
```

#### Endpoints API

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/flowise/prediction/:chatflowId` | POST | Envoyer un message à Peter |
| `/api/transcribe` | POST | Transcrire audio → texte (Whisper) |
| `/api/proxy?url=...` | GET | Proxy CORS pour webview |
| `/api/analytics` | POST | Enregistrer événement analytics |

#### Exemple d'appel API

```typescript
// Envoyer un message à Peter
const response = await fetch('/api/flowise/prediction/abc123', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'Bonjour Peter, je m\'appelle Alice',
    chatId: 'session_123456789'
  })
});

const data = await response.json();
console.log(data.parsedContent.Response); // Réponse de Peter
```

### Pour les enseignants

1. **Accéder à l'application** : Ouvrir l'URL sur un ordinateur (desktop)
2. **Cliquer sur "Démarrer l'aventure"** pour lancer la conversation avec Peter
3. **Interagir avec Peter** : Poser des questions, répondre aux scénarios
4. **Explorer les médias** : Cliquer sur les vidéos/liens suggérés par Peter
5. **Suivre la progression** : Voir les indices trouvés et le score dans le header
6. **Recommencer** : Rafraîchir la page pour une nouvelle session

### Pour les élèves

- **Soyez naturels** : Parlez à Peter comme à un ami
- **Prenez le temps** : Explorez les vidéos et articles
- **Trouvez les indices** : Ils vous aident à comprendre les enjeux
- **Posez des questions** : Peter est là pour vous guider !

---

## ⚡ Performance

### Temps de réponse

| Métrique | Valeur cible | Valeur actuelle | Optimisation |
|----------|--------------|-----------------|--------------|
| **Première réponse Flowise** | < 5s | 3-5s | ✅ Atteint |
| **Réponse en cache** | < 100ms | < 100ms | ✅ Atteint |
| **Transcription Whisper** | < 3s | 2-4s | ⚠️ Dépend taille audio |
| **Chargement initial** | < 2s | 1.5s | ✅ Atteint |

### Optimisations implémentées

#### Backend (serveur)

1. **Cache en mémoire (Map)** : TTL 5 minutes
   - Économie de 7-12s par question répétée
   - Nettoyage automatique des entrées expirées

2. **Désactivation `returnSourceDocuments`**
   - Réduction de 50-90% du payload JSON
   - Moins de bande passante et parsing plus rapide

3. **Parsing JSON optimisé**
   - Détection rapide du JSON imbriqué
   - Suppression des regex coûteux
   - Fallback avec extraction regex si parsing échoue

4. **Compression Gzip**
   - Réduction de 60-70% de la taille des réponses HTTP

5. **Timeout équilibré**
   - 30 secondes pour réponses complexes
   - AbortController pour éviter les requêtes bloquées

#### Frontend (client)

1. **Extraction média conditionnelle**
   - Vérification rapide avant regex
   - Évite le traitement pour messages sans média

2. **Analytics non-bloquantes**
   - `setTimeout(..., 0)` pour tracking asynchrone
   - Aucun impact sur l'UX

3. **Parsing serveur pré-calculé**
   - Client reçoit `parsedContent` prêt à l'emploi
   - Fallback client uniquement si serveur échoue

### Métriques de performance (logs)

```
[Flowise Performance] Total: 3542ms | Fetch: 3201ms | Parse: 12ms | Size: 8.42KB
[Client Performance] Total: 3548ms | Parse: 3ms | Media: 1ms
[Server Performance] Flowise Fetch: 3201ms | Parse: 12ms | Payload: 8.42KB
[End-to-End] Total user-visible latency: 3548ms
```

### Historique des optimisations majeures

#### [2025-11-06] Robustesse parsing JSON
- ✅ Garantie qu'aucun JSON brut n'est affiché aux utilisateurs
- ✅ Fallback triple niveau (JSON complet → regex → message amical)
- ✅ Timeout augmenté à 30s

#### [2025-11-06] Corrections UX critiques
- ✅ Suppression messages debug JSON
- ✅ Désactivation cache pour mémoire conversationnelle
- ✅ Peter se souvient du nom de l'utilisateur

#### [2025-11-06] Performance - Objectif 3-5s atteint
- ✅ Réduction temps de réponse de **7-12s → 3-5s**
- ✅ Cache intelligent avec TTL
- ✅ Parsing JSON ultra-optimisé
- ✅ Extraction média conditionnelle

---

## 🔧 Développement

### Conventions de code

- **TypeScript strict** : `tsconfig.json` avec `strict: true`
- **ESLint** : (à configurer)
- **Prettier** : (à configurer)
- **Commits** : Messages en français, descriptifs

### Structure des composants React

```typescript
// Exemple : ChatInterface.tsx
interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
}

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading
}: ChatInterfaceProps) {
  // Logic
  return (/* JSX */);
}
```

### Gestion d'état

- **Local state** : `useState` pour état composant
- **Server state** : TanStack Query pour cache API
- **Custom hooks** : Pour logique réutilisable (`use-flowise`, etc.)

### Tests

> **À venir** : Configuration Jest/Vitest pour tests unitaires et d'intégration

### Debugging

#### Activer les logs de performance

Les logs sont activés par défaut dans `server/routes.ts` :

```typescript
console.log(`[Flowise Performance] Total: ${data._performance.totalTime}ms`);
```

Pour désactiver :

```typescript
// Commenter les lignes console.log(...) dans routes.ts
```

#### Tester l'API Flowise localement

```bash
curl -X POST http://localhost:5000/api/flowise/prediction/abc123 \
  -H "Content-Type: application/json" \
  -d '{"question": "Bonjour", "chatId": "test_session"}'
```

---

## 🤝 Contribuer

### Processus de contribution

1. **Fork** le repository
2. **Créer une branche** : `git checkout -b feature/ma-fonctionnalite`
3. **Commiter** : `git commit -m "Ajout de ma fonctionnalité"`
4. **Push** : `git push origin feature/ma-fonctionnalite`
5. **Pull Request** : Décrire les changements en détail

### Roadmap

- [ ] Tests unitaires (Jest/Vitest)
- [ ] Tests E2E (Playwright)
- [ ] Mode responsive (tablette/mobile)
- [ ] Support multilingue (anglais, espagnol)
- [ ] Dashboard enseignant (suivi de classe)
- [ ] Export de sessions au format PDF
- [ ] Gamification (badges, classement)
- [ ] Intégration LMS (Moodle, Google Classroom)

### Rapporter un bug

Créer une **issue** sur GitHub avec :

- **Description** du bug
- **Étapes pour reproduire**
- **Comportement attendu** vs **comportement actuel**
- **Captures d'écran** si possible
- **Environnement** (OS, navigateur, version Node.js)

---

## 📄 Licence

Ce projet est sous licence **MIT**.

```
MIT License

Copyright (c) 2025 Dilemme Plastique

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Remerciements

- **Flowise** : Pour la plateforme de chatbot IA
- **OpenAI** : Pour l'API Whisper
- **shadcn/ui** : Pour les composants UI de qualité
- **Radix UI** : Pour les primitives accessibles
- **Rectify** : Pour l'analytics anonyme
- **Gumlet** : Pour le CDN et lecteur vidéo

---

## 📞 Contact

- **Maintainer** : memoways
- **Email** : (à compléter)
- **Website** : (à compléter)
- **GitHub** : https://github.com/memoways/Prototype-Dilemme-Plastique_mano

---

## 📚 Ressources complémentaires

- [Documentation Flowise](https://docs.flowiseai.com/)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

---

**Fait avec 💚 pour l'éducation environnementale**
