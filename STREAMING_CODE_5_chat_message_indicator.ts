// ============================================================================
// FICHIER 5: Modifications pour client/src/components/chat/ChatMessage.tsx
// ============================================================================
//
// INSTRUCTIONS MODIFICATION 1:
// 1. Ouvrir client/src/components/chat/ChatMessage.tsx dans Replit
// 2. Trouver la ligne ~26 qui contient:
//    const isPeter = message.sender === 'peter';
//    const isDebug = message.sender === 'debug';
// 3. AJOUTER cette ligne juste après:
//
const isStreaming = message.isStreaming || false; // NOUVEAU
//
// ============================================================================
//
// INSTRUCTIONS MODIFICATION 2:
// 1. Dans le MÊME fichier ChatMessage.tsx
// 2. Trouver la section qui affiche le contenu du message (vers ligne 240)
// 3. Chercher cette ligne:
//    <p className="text-sm leading-relaxed whitespace-pre-wrap">
//      {message.content}
//    </p>
// 4. REMPLACER par:
//
//    <p className="text-sm leading-relaxed whitespace-pre-wrap">
//      {message.content}
//      {/* NOUVEAU: Curseur clignotant si streaming */}
//      {isStreaming && isPeter && (
//        <span className="inline-block w-1.5 h-4 ml-1 bg-white animate-pulse" />
//      )}
//    </p>
//
// ============================================================================
//
// CODE COMPLET DE LA SECTION (pour référence):

export function ChatMessage({
  message,
  onVideoClick,
  onLinkClick,
  onThumbsUp,
  onChoiceClick,
  userAvatarUrl,
  userName = 'Utilisateur'
}: ChatMessageProps) {
  const isPeter = message.sender === 'peter';
  const isDebug = message.sender === 'debug';
  const isStreaming = message.isStreaming || false; // ← AJOUTER CETTE LIGNE

  // ... reste du code existant ...

  // Plus bas dans le code (vers ligne 240), modifier l'affichage:

  return (
    <div className={/* ... */}>
      {/* ... avatar et autres éléments ... */}

      <div className={/* ... */}>
        <div className={/* ... */}>
          {messageType === 'debug' ? (
            // ... code debug existant ...
          ) : messageType === 'with-choices' ? (
            // ... code choices existant ...
          ) : messageType === 'with-links' ? (
            // ... code links existant ...
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
              {/* ← AJOUTER CE BLOC */}
              {isStreaming && isPeter && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-white animate-pulse" />
              )}
            </p>
          )}
        </div>

        {/* ... reste du code ... */}
      </div>
    </div>
  );
}
