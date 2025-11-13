// ============================================================================
// FICHIER 3: Code pour client/src/hooks/use-flowise.ts
// ============================================================================
//
// INSTRUCTIONS:
// 1. Ouvrir client/src/hooks/use-flowise.ts dans Replit
// 2. Trouver la fonction `sendMessage` (ligne ~95)
// 3. REMPLACER TOUTE LA FONCTION par ce code
// 4. Sauvegarder le fichier
//
// IMPORTANT: Ne remplacer QUE la fonction sendMessage, garder le reste du fichier intact
//
// ============================================================================

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
