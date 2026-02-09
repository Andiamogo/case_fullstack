/**
 * Parses an SSE stream from a ReadableStreamDefaultReader, invoking a callback
 * for each parsed event.
 */
export async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (eventType: string, data: unknown) => void,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEventType = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEventType = line.slice(7);
      } else if (line.startsWith("data: ") && currentEventType) {
        try {
          const data = JSON.parse(line.slice(6));
          onEvent(currentEventType, data);
        } catch {
          // Ignore parse errors
        }
        currentEventType = "";
      }
    }
  }
}
