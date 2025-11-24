import { NextResponse } from "next/server";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const rawTitle = searchParams.get("title");

    if (!rawTitle) {
        return NextResponse.json(
            { error: "Missing required query parameter: title" },
            { status: 400 }
        );
    }

    try {
        const encodedTitle = encodeURIComponent(rawTitle.trim().replace(/\s+/g, "_"));
        const wikiResponse = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`,
            {
                headers: {
                    "User-Agent": "Europe-Travel-Advisor/1.0 (contact: admin@example.com)",
                },
                cache: "no-store",
            }
        );

        if (!wikiResponse.ok) {
            return NextResponse.json(
                { error: "Wikipedia request failed" },
                { status: wikiResponse.status }
            );
        }

        const data = await wikiResponse.json();
        const imageUrl = data?.originalimage?.source || data?.thumbnail?.source || null;

        return NextResponse.json({ imageUrl, raw: data });
    } catch (err) {
        console.error("Wiki image API error", err);
        return NextResponse.json(
            { error: "Unexpected error fetching image" },
            { status: 500 }
        );
    }
}

