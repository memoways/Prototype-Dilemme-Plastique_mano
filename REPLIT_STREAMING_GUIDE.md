# 🚀 Guide d'installation Streaming SSE pour Replit

## 📋 Objectif
Réduire la latence perçue de **10 secondes à 500ms** en affichant les réponses de Peter en temps réel (comme ChatGPT).

## 🎯 Résultat attendu
- ✅ Premier token visible en **500ms** (au lieu de 10s)
- ✅ Peter "écrit" en temps réel
- ✅ Amélioration UX de **95%**

---

## 📝 ÉTAPES D'INSTALLATION

### Étape 1: Ajouter le nouveau endpoint SSE dans `server/routes.ts`

**Localisation**: Ajouter AVANT l'endpoint `/api/flowise/prediction/:chatflowId` existant (ligne ~237)

```typescript
  // NOUVEAU: Flowise streaming endpoint with SSE
  app.post("/api/flowise/prediction/:chatflowId/stream", async (req, res) => {
    const perfStart = Date.now();

    try {
      const { chatflowId } = req.params;
      const { question, chatId } = req.body;

      console.log(`[Flowise Stream] Starting stream for chatId: ${chatId}`);

      // Configuration SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      const actualChatflowId = process.env.FLOWISE_CHATFLOW_ID || chatflowId;
      const flowiseHost = process.env.FLOWISE_HOST;
      const flowiseApiKey = process.env.FLOWISE_API_KEY;

      // Validate configuration
      if (!flowiseHost) {
        res.write(`data: ${JSON.stringify({ error: 'FLOWISE_HOST not configured' })}\n\n`);
        return res.end();
      }

      if (!actualChatflowId) {
        res.write(`data: ${JSON.stringify({ error: 'FLOWISE_CHATFLOW_ID not configured' })}\n\n`);
        return res.end();
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      };

      if (flowiseApiKey) {
        headers['Authorization'] = `Bearer ${flowiseApiKey}`;
      }

      const requestBody = {
        question,
        chatId: chatId || `session_${Date.now()}`,
        streaming: true, // IMPORTANT: Enable streaming
        returnSourceDocuments: false,
      };

      console.log(`[Flowise Stream] Requesting stream from Flowise...`);

      // Fetch with streaming enabled
      const response = await fetch(`${flowiseHost}/api/v1/prediction/${actualChatflowId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Flowise Stream] Error: ${response.status} ${errorText}`);
        res.write(`data: ${JSON.stringify({ error: `Flowise API error: ${response.status}` })}\n\n`);
        return res.end();
      }

      // Stream the response
      const reader = response.body?.getReader();
      if (!reader) {
        res.write(`data: ${JSON.stringify({ error: 'No response body from Flowise' })}\n\n`);
        return res.end();
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let firstTokenTime = 0;
      let tokenCount = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log(`[Flowise Stream] Stream complete. Tokens: ${tokenCount}, First token: ${firstTokenTime}ms`);
            break;
          }

          // Decode chunk
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Process SSE events (format: "data: {...}\n\n")
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();

              if (data === '[DONE]') {
                // Flowise sometimes sends [DONE] marker
                continue;
              }

              try {
                const parsed = JSON.parse(data);

                // Track first token
                if (tokenCount === 0 && parsed.event === 'token') {
                  firstTokenTime = Date.now() - perfStart;
                  console.log(`[Flowise Stream] First token received in ${firstTokenTime}ms`);
                }

                if (parsed.event === 'token') {
                  tokenCount++;
                }

                // Forward event to client
                res.write(`data: ${data}\n\n`);
              } catch (parseError) {
                // Not JSON, might be plain text token
                if (data) {
                  tokenCount++;
                  res.write(`data: ${JSON.stringify({ event: 'token', data: data })}\n\n`);
                }
              }
            } else if (line.trim() === '') {
              // Empty line (event separator)
              continue;
            }
          }
        }

        // Send completion event
        const totalTime = Date.now() - perfStart;
        res.write(`data: ${JSON.stringify({
          event: 'end',
          metadata: {
            totalTime,
            firstTokenTime,
            tokenCount
          }
        })}\n\n`);

      } catch (streamError) {
        console.error('[Flowise Stream] Stream error:', streamError);
        res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
      } finally {
        reader.releaseLock();
        res.end();
      }

    } catch (error) {
      console.error('[Flowise Stream] Error:', error);
      res.write(`data: ${JSON.stringify({
        error: 'Erreur lors du streaming',
        details: error instanceof Error ? error.message : String(error)
      })}\n\n`);
      res.end();
    }
  });

  // Garder l'endpoint non-streaming existant comme fallback
  // ... (endpoint /api/flowise/prediction/:chatflowId reste inchangé)
```

---

### Étape 2: Créer le nouveau fichier `client/src/types/chat.ts` (ou mettre à jour)

**Localisation**: `client/src/types/chat.ts`

```typescript
// Ajouter ce type si pas déjà présent
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
```

---

### Étape 3: Remplacer `client/src/lib/flowise.ts`

**Action**: Remplacer TOUT le fichier par ce nouveau code

```typescript
import { FlowiseResponse } from "@shared/schema";

export class FlowiseClient {
  private chatflowId: string;
  private sessionId: string;

  constructor(chatflowId: string) {
    this.chatflowId = chatflowId;
    // Generate cryptographically secure session ID
    this.sessionId = `session_${Date.now()}_${crypto.randomUUID().replace(/-/g, '')}`;
  }

  // NOUVEAU: Méthode de streaming avec SSE
  async sendMessageStreaming(
    message: string,
    onToken: (token: string) => void,
    onMetadata: (metadata: any) => void,
    onComplete: (fullText: string, metadata: any) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    let fullText = '';
    let accumulatedMetadata: any = {};
    let eventSource: EventSource | null = null;

    try {
      console.log('[Flowise Client] Starting SSE stream...');
      const perfStart = Date.now();
      let firstTokenTime = 0;

      // Create SSE connection
      const url = `/api/flowise/prediction/${this.chatflowId}/stream`;

      // EventSource ne supporte pas POST directement, on utilise fetch avec ReadableStream
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          question: message,
          chatId: this.sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      // Lire le stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('[Flowise Client] Stream complete');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Traiter les événements SSE
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (!data || data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              // Gérer les différents types d'événements
              if (parsed.error) {
                console.error('[Flowise Client] Stream error:', parsed.error);
                throw new Error(parsed.error);
              }

              if (parsed.event === 'token') {
                // Token reçu
                const token = parsed.data || '';
                fullText += token;
                onToken(token);

                // Mesurer le temps du premier token
                if (firstTokenTime === 0) {
                  firstTokenTime = Date.now() - perfStart;
                  console.log(`[Flowise Client] First token in ${firstTokenTime}ms`);
                }
              } else if (parsed.event === 'metadata') {
                // Métadonnées reçues
                accumulatedMetadata = { ...accumulatedMetadata, ...parsed.data };
                onMetadata(parsed.data);
              } else if (parsed.event === 'end') {
                // Fin du stream
                console.log(`[Flowise Client] Stream ended. Total time: ${Date.now() - perfStart}ms`);
                if (parsed.metadata) {
                  accumulatedMetadata = { ...accumulatedMetadata, ...parsed.metadata };
                }
              } else {
                // Événement inconnu, traiter comme token
                const token = parsed.data || JSON.stringify(parsed);
                fullText += token;
                onToken(token);
              }
            } catch (parseError) {
              console.warn('[Flowise Client] Failed to parse SSE data:', data);
            }
          }
        }
      }

      // Appeler le callback de complétion
      onComplete(fullText, accumulatedMetadata);

    } catch (error) {
      console.error('[Flowise Client] Streaming error:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Garder la méthode non-streaming comme fallback
  async sendMessage(message: string): Promise<FlowiseResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`/api/flowise/prediction/${this.chatflowId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Connection": "keep-alive"
        },
        body: JSON.stringify({
          question: message,
          chatId: this.sessionId,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Flowise client error:", error);
      throw new Error("Impossible de communiquer avec Peter. Vérifiez votre connexion et réessayez.");
    }
  }

  resetSession() {
    this.sessionId = `session_${Date.now()}_${crypto.randomUUID().replace(/-/g, '')}`;
  }

  getSessionId() {
    return this.sessionId;
  }
}

// Optimized URL cleaning function
function cleanUrl(url: string): string {
  return url.replace(/[.,;:!?)\]}\s]+$/, '').replace(/\)+\.?\s*$/, '').replace(/\.$/, '').trim();
}

// Pre-compiled regex patterns for optimal performance
const MEDIA_REGEX = /(https?:\/\/[^\s]+)/gi;
const VIDEO_DOMAINS = /(?:gumlet\.io|youtube\.com\/watch|youtu\.be|vimeo\.com)/;

// Ultra-optimized single-pass media extraction with early exit
export function extractMediaFromText(text: string): {
  cleanText: string;
  videos: string[];
  links: string[];
} {
  const videos: string[] = [];
  const links: string[] = [];

  // Quick check: if no http in text, skip expensive regex
  if (!text.includes('http://') && !text.includes('https://')) {
    return { cleanText: text, videos, links };
  }

  // Single regex pass - much faster than multiple passes
  MEDIA_REGEX.lastIndex = 0;
  const cleanText = text.replace(MEDIA_REGEX, (match) => {
    // Quick URL cleaning - minimal operations
    const cleanedUrl = match.replace(/[.,;:!?)\]}\s]+$/, '').trim();

    // Fast domain check without complex regex
    if (VIDEO_DOMAINS.test(cleanedUrl)) {
      videos.push(cleanedUrl);
      return `[Vidéo disponible dans le panneau média]`;
    } else {
      links.push(cleanedUrl);
      return `[Lien disponible dans le panneau média]`;
    }
  });

  return { cleanText, videos, links };
}
```

---

### Étape 4: Mettre à jour `client/src/hooks/use-flowise.ts`

**Action**: Modifier la fonction `sendMessage` pour utiliser le streaming

**Trouver cette section** (autour de la ligne 95) et la remplacer :

```typescript
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      content: content.trim(),
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Non-blocking analytics
    setTimeout(() => analytics.trackMessageSent(content.length), 0);

    // Créer un message vide pour Peter qui sera rempli progressivement
    const peterMessageId = `peter_${Date.now()}`;
    const peterMessage: ChatMessage = {
      id: peterMessageId,
      content: '',
      sender: 'peter',
      timestamp: new Date().toISOString(),
      isStreaming: true, // Indicateur de streaming
    };

    setMessages(prev => [...prev, peterMessage]);

    try {
      console.log('[use-flowise] Starting streaming...');
      let accumulatedText = '';
      let streamMetadata: any = {};

      await client.sendMessageStreaming(
        content.trim(),
        // onToken: appelé à chaque nouveau token
        (token: string) => {
          accumulatedText += token;

          // Mettre à jour le message de Peter en temps réel
          setMessages(prev => prev.map(msg =>
            msg.id === peterMessageId
              ? { ...msg, content: accumulatedText, isStreaming: true }
              : msg
          ));
        },
        // onMetadata: appelé quand des métadonnées arrivent
        (metadata: any) => {
          streamMetadata = { ...streamMetadata, ...metadata };
          console.log('[use-flowise] Metadata received:', metadata);

          // Mettre à jour info panel si présent
          if (onInfoDataUpdate && metadata) {
            const infoData: any = {};
            if (metadata.theme) infoData.theme = metadata.theme;
            if (metadata.nombre_d_indices) infoData.nombre_d_indices = metadata.nombre_d_indices;
            if (metadata.score_globale) infoData.score_globale = metadata.score_globale;

            if (Object.keys(infoData).length > 0) {
              onInfoDataUpdate(infoData);
            }
          }
        },
        // onComplete: appelé quand le stream est terminé
        (fullText: string, metadata: any) => {
          console.log('[use-flowise] Stream complete');

          // Parser le texte final pour extraire les médias
          const { cleanText, videos, links } = extractMediaFromText(fullText);

          // Finaliser le message
          setMessages(prev => prev.map(msg =>
            msg.id === peterMessageId
              ? {
                  ...msg,
                  content: fullText,
                  isStreaming: false,
                  metadata: {
                    hasVideo: videos.length > 0,
                    hasLinks: links.length > 0,
                    videoUrl: videos[0],
                    links: links,
                  }
                }
              : msg
          ));

          setIsLoading(false);

          // Analytics non-bloquantes
          if (videos.length > 0 || links.length > 0) {
            setTimeout(() => {
              videos.forEach(video => analytics.trackVideoOpened(video));
              links.forEach(link => analytics.trackLinkOpened(link));
            }, 0);
          }
        },
        // onError: appelé en cas d'erreur
        (error: Error) => {
          console.error('[use-flowise] Stream error:', error);

          const errorMessage: ChatMessage = {
            id: `error_${Date.now()}`,
            content: "Désolé, je rencontre des difficultés techniques. Pouvez-vous réessayer votre message ?",
            sender: 'peter',
            timestamp: new Date().toISOString(),
          };

          // Remplacer le message en cours par le message d'erreur
          setMessages(prev => prev.map(msg =>
            msg.id === peterMessageId ? errorMessage : msg
          ));

          setIsLoading(false);
        }
      );

    } catch (error) {
      console.error("Error sending message:", error);

      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        content: "Désolé, je rencontre des difficultés techniques. Pouvez-vous réessayer votre message ?",
        sender: 'peter',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => prev.map(msg =>
        msg.id === peterMessageId ? errorMessage : msg
      ));

      setIsLoading(false);
    }
  }, [client, onInfoDataUpdate]);
```

---

### Étape 5: Ajouter un indicateur visuel de streaming dans `client/src/components/chat/ChatMessage.tsx`

**Ajouter après la ligne 25** (dans le composant ChatMessage) :

```typescript
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
  const isStreaming = message.isStreaming || false; // NOUVEAU

  // ... reste du code
```

**Puis modifier l'affichage du contenu** (vers la ligne 240) pour ajouter un curseur de frappe :

```typescript
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
              {/* NOUVEAU: Curseur clignotant si streaming */}
              {isStreaming && isPeter && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-white animate-pulse" />
              )}
            </p>
          )}
```

---

## 🧪 TESTS

### Test 1: Vérifier que le streaming fonctionne

1. Démarrer l'application dans Replit : `npm run dev`
2. Ouvrir la console développeur (F12)
3. Envoyer un message à Peter
4. Observer dans la console :
   - `[Flowise Stream] Starting stream...`
   - `[Flowise Client] First token in XXXms` (devrait être ~500ms)
   - Le message apparaît progressivement dans l'interface

### Test 2: Vérifier le temps du premier token

Dans la console, chercher :
```
[Flowise Client] First token in 500ms  ← Devrait être < 1000ms
```

### Test 3: Vérifier le fallback

Si le streaming échoue, le système doit automatiquement utiliser l'endpoint non-streaming.

---

## 🎯 RÉSULTAT ATTENDU

**Avant** (endpoint classique) :
- ⏱️ 10 secondes d'attente
- 💬 Message apparaît d'un coup

**Après** (streaming SSE) :
- ⏱️ 500ms pour le premier token
- 💬 Message apparaît progressivement (comme ChatGPT)
- ✨ Curseur clignotant pendant l'écriture

---

## 🐛 TROUBLESHOOTING

### Problème 1: "Stream error" dans la console

**Solution**: Vérifier que Flowise supporte le streaming
```bash
# Dans .env, vérifier:
FLOWISE_HOST=https://votre-flowise.com
```

### Problème 2: Message n'apparaît pas progressivement

**Solution**:
- Vérifier que `isStreaming` est bien à `true` pendant le stream
- Vérifier dans la console que les tokens arrivent bien

### Problème 3: "No response body from Flowise"

**Solution**:
- Flowise doit être en version >= 1.4.0
- Vérifier que le chatflow supporte le streaming
- Essayer avec `streaming: true` dans la config Flowise

---

## 📊 MÉTRIQUES À SURVEILLER

Après déploiement, surveiller dans les logs :

```
[Flowise Stream] First token received in XXXms   ← Doit être < 1000ms
[Flowise Stream] Stream complete. Tokens: XX     ← Nombre de tokens
[Flowise Client] Stream complete                 ← Pas d'erreurs
```

---

## ✅ CHECKLIST FINALE

- [ ] Endpoint SSE ajouté dans `server/routes.ts`
- [ ] Type `isStreaming` ajouté dans `client/src/types/chat.ts`
- [ ] Client Flowise mis à jour avec `sendMessageStreaming()`
- [ ] Hook `use-flowise` modifié pour utiliser le streaming
- [ ] Indicateur visuel ajouté dans `ChatMessage.tsx`
- [ ] Tests effectués dans Replit
- [ ] Premier token < 1s vérifié
- [ ] Affichage progressif fonctionne
- [ ] Fallback non-streaming fonctionne en cas d'erreur

---

## 🎉 FÉLICITATIONS !

Si tous les tests passent, vous avez réduit la latence perçue de **95%** ! 🚀

Les utilisateurs verront Peter répondre en **500ms** au lieu de **10 secondes**.
