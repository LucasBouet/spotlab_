import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { resolveTrackFile } from "@/lib/stream";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json(
      { error: "Identifiant invalide." },
      { status: 400 },
    );
  }

  try {
    await resolveTrackFile(id);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Le préchargement du titre a échoué.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true });
}
