import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

const DEEZER_ENDPOINTS = {
  track: "https://api.deezer.com/search",
  album: "https://api.deezer.com/search/album",
  artist: "https://api.deezer.com/search/artist",
} as const;

type SearchType = keyof typeof DEEZER_ENDPOINTS;

function isSearchType(value: string | null): value is SearchType {
  return value === "track" || value === "album" || value === "artist";
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const type = searchParams.get("type");

  if (!query) {
    return NextResponse.json({ data: [] });
  }

  if (!isSearchType(type)) {
    return NextResponse.json(
      { error: "Type de recherche invalide." },
      { status: 400 },
    );
  }

  const deezerUrl = new URL(DEEZER_ENDPOINTS[type]);
  deezerUrl.searchParams.set("q", query);
  deezerUrl.searchParams.set("limit", "24");

  let deezerResponse: Response;
  try {
    deezerResponse = await fetch(deezerUrl, { cache: "no-store" });
  } catch {
    return NextResponse.json(
      { error: "Le service de recherche est indisponible." },
      { status: 502 },
    );
  }

  if (!deezerResponse.ok) {
    return NextResponse.json(
      { error: "Le service de recherche est indisponible." },
      { status: 502 },
    );
  }

  const payload = await deezerResponse.json();

  if (payload?.error) {
    return NextResponse.json(
      { error: "La recherche a échoué." },
      { status: 502 },
    );
  }

  return NextResponse.json({ data: payload.data ?? [] });
}
