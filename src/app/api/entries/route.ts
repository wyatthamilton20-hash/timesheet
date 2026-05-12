import { NextRequest, NextResponse } from "next/server";

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TABLE_NAME = process.env.AIRTABLE_TABLE_NAME!;
const AIRTABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;

const headers = {
  Authorization: `Bearer ${PAT}`,
  "Content-Type": "application/json",
};

// GET all entries
export async function GET() {
  const records: Array<{ id: string; fields: Record<string, string> }> = [];
  let offset: string | undefined;

  do {
    const url = offset ? `${AIRTABLE_URL}?offset=${offset}` : AIRTABLE_URL;
    const res = await fetch(url, { headers, cache: "no-store" });
    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);

  const entries = records.map((r) => ({
    id: r.fields.entryId || r.id,
    clockIn: r.fields.clockIn || "",
    clockOut: r.fields.clockOut || null,
    note: r.fields.note || "",
    payPeriod: r.fields.payPeriod ? Number(r.fields.payPeriod) : null,
    job: r.fields.job || "",
    _airtableId: r.id,
  }));

  return NextResponse.json(entries);
}

// POST a new entry
export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(AIRTABLE_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fields: {
        entryId: body.id,
        clockIn: body.clockIn,
        clockOut: body.clockOut || null,
        note: body.note || "",
        payPeriod: body.payPeriod ?? null,
        job: body.job || "",
      },
    }),
  });
  const data = await res.json();
  return NextResponse.json(data);
}

// PATCH — update an entry
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { _airtableId, ...fields } = body;

  const res = await fetch(`${AIRTABLE_URL}/${_airtableId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      fields: {
        entryId: fields.id,
        clockIn: fields.clockIn,
        clockOut: fields.clockOut || null,
        note: fields.note || "",
        payPeriod: fields.payPeriod ?? null,
        job: fields.job || "",
      },
    }),
  });
  const data = await res.json();
  return NextResponse.json(data);
}

// DELETE an entry
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const airtableId = searchParams.get("airtableId");

  if (!airtableId) {
    return NextResponse.json({ error: "Missing airtableId" }, { status: 400 });
  }

  await fetch(`${AIRTABLE_URL}/${airtableId}`, {
    method: "DELETE",
    headers,
  });

  return NextResponse.json({ success: true });
}
