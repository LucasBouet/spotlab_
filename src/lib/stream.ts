const RIP_API_URL = process.env.RIP_API_URL ?? "http://localhost:8081";

export async function resolveTrackFile(id: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${RIP_API_URL}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  } catch {
    throw new Error("Le service de téléchargement est indisponible.");
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error ?? "Le téléchargement du titre a échoué.");
  }

  return payload.file as string;
}
