import { NextRequest, NextResponse } from "next/server";

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TABLE = "Settings";
const SETTINGS_KEY = "invoice_settings";
const AIRTABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE}`;

const headers = {
  Authorization: `Bearer ${PAT}`,
  "Content-Type": "application/json",
};

async function findRecord(): Promise<{ id: string; value: string } | null> {
  const url = `${AIRTABLE_URL}?filterByFormula={key}="${SETTINGS_KEY}"&maxRecords=1`;
  const res = await fetch(url, { headers, cache: "no-store" });
  const data = await res.json();
  if (data.records?.length) {
    return { id: data.records[0].id, value: data.records[0].fields.value ?? "{}" };
  }
  return null;
}

export async function GET() {
  const record = await findRecord();
  if (!record) return NextResponse.json(null);
  try {
    return NextResponse.json(JSON.parse(record.value));
  } catch {
    return NextResponse.json(null);
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const value = JSON.stringify(body);
  const existing = await findRecord();

  if (existing) {
    const res = await fetch(`${AIRTABLE_URL}/${existing.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields: { value } }),
    });
    return NextResponse.json(await res.json());
  } else {
    const res = await fetch(AIRTABLE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ fields: { key: SETTINGS_KEY, value } }),
    });
    return NextResponse.json(await res.json());
  }
}
