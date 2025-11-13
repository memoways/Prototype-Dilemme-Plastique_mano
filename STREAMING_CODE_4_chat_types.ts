// ============================================================================
// FICHIER 4: Code pour client/src/types/chat.ts
// ============================================================================
//
// INSTRUCTIONS:
// 1. Ouvrir client/src/types/chat.ts dans Replit (ou le créer s'il n'existe pas)
// 2. Trouver l'interface ChatMessage
// 3. AJOUTER la propriété `isStreaming?: boolean;` dans l'interface
// 4. Sauvegarder le fichier
//
// IMPORTANT: Si le fichier n'existe pas, créer ce fichier avec TOUT ce contenu
//
// ============================================================================

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'peter' | 'debug';
  timestamp: string;
  metadata?: {
    hasVideo?: boolean;
    hasLinks?: boolean;
    videoUrl?: string;
    links?: string[];
  };
  isStreaming?: boolean; // NOUVEAU: Indique si le message est en cours de streaming
}
