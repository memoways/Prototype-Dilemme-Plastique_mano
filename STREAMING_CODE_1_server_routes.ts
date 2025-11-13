// ============================================================================
// FICHIER 1: Code à ajouter dans server/routes.ts
// ============================================================================
//
// INSTRUCTIONS:
// 1. Ouvrir server/routes.ts dans Replit
// 2. Trouver la ligne ~237 qui contient:
//    app.post("/api/flowise/prediction/:chatflowId", async (req, res) => {
// 3. AJOUTER ce code JUSTE AVANT cette ligne (ne pas remplacer l'endpoint existant)
// 4. Sauvegarder le fichier
//
// ============================================================================

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

  // L'endpoint non-streaming existant reste inchangé ci-dessous
  // app.post("/api/flowise/prediction/:chatflowId", async (req, res) => {
  //   ... (code existant à garder)
