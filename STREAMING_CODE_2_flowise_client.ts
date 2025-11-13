// ============================================================================
// FICHIER 2: Code COMPLET pour client/src/lib/flowise.ts
// ============================================================================
//
// INSTRUCTIONS:
// 1. Ouvrir client/src/lib/flowise.ts dans Replit
// 2. REMPLACER TOUT LE CONTENU par ce code
// 3. Sauvegarder le fichier
//
// ============================================================================

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

    try {
      console.log('[Flowise Client] Starting SSE stream...');
      const perfStart = Date.now();
      let firstTokenTime = 0;

      // Create fetch request for streaming
      const url = `/api/flowise/prediction/${this.chatflowId}/stream`;

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
