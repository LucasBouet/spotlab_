import { importDeezerPlaylistForUser } from "@/features/Playlists/import-deezer-playlist";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Non authentifié." }), {
      status: 401,
    });
  }

  const body = await request.json().catch(() => null);
  const link = typeof body?.link === "string" ? body.link : "";
  const destination = body?.destination === "liked" ? "liked" : "playlist";
  const name = typeof body?.name === "string" ? body.name : undefined;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      }

      try {
        const result = await importDeezerPlaylistForUser(user.id, link, {
          destination,
          name,
          onProgress: (fetched, total) =>
            send({ type: "progress", fetched, total }),
        });
        send({ type: "done", ...result });
      } catch (error) {
        send({
          type: "error",
          message:
            error instanceof Error ? error.message : "Import impossible.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
