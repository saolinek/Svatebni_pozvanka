import { getStore } from "@netlify/blobs";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const guestsUrl = new URL("../../data/guests.json", import.meta.url);

const json = (statusCode, body) => ({
  statusCode,
  headers,
  body: JSON.stringify(body),
});

const normalizeText = (value, maxLength = 500) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const loadGuests = async () => {
  const raw = await readFile(guestsUrl, "utf8");
  const guests = JSON.parse(raw);

  if (!Array.isArray(guests)) {
    throw new Error("data/guests.json musí obsahovat pole hostů.");
  }

  return guests
    .filter((guest) => guest && typeof guest.id === "string" && typeof guest.name === "string")
    .map((guest) => ({
      id: guest.id,
      name: guest.name,
      group: guest.group || "",
    }));
};

const getStoreInstance = () => getStore({ name: "wedding-rsvp", consistency: "strong" });

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  try {
    const guests = await loadGuests();

    if (event.httpMethod === "GET") {
      const store = getStoreInstance();
      const list = await store.list();
      const entries = await Promise.all(
        list.blobs.map(async (blob) => store.get(blob.key, { type: "json", consistency: "strong" }))
      );
      const guestMap = new Map(guests.map((guest) => [guest.id, guest]));
      const responses = entries
        .filter(Boolean)
        .map((entry) => ({
          ...entry,
          assignedGuestName:
            guestMap.get(entry.assignedGuestId)?.name || entry.assignedGuestName || "",
          assignedGroup: guestMap.get(entry.assignedGuestId)?.group || entry.assignedGroup || "",
        }))
        .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));

      return json(200, {
        guests,
        responses,
        stats: {
          guests: guests.length,
          responses: responses.length,
          attending: responses.filter((entry) => entry.attending).length,
          declined: responses.filter((entry) => !entry.attending).length,
          assigned: responses.filter((entry) => entry.assignedGuestId || entry.assignedGuestName).length,
        },
      });
    }

    if (event.httpMethod === "PATCH") {
      const payload = JSON.parse(event.body || "{}");
      const responseId = normalizeText(payload.responseId, 120);
      if (!responseId) {
        return json(400, { error: "Chybí ID odpovědi." });
      }

      const store = getStoreInstance();
      const existing = await store.get(responseId, { type: "json", consistency: "strong" });
      if (!existing) {
        return json(404, { error: "Odpověď nebyla nalezena." });
      }

      const assignedGuestId = normalizeText(payload.assignedGuestId, 120);
      const assignedGuest = guests.find((guest) => guest.id === assignedGuestId);
      const assignedGuestName = assignedGuest
        ? assignedGuest.name
        : normalizeText(payload.assignedGuestName, 160);

      const updated = {
        ...existing,
        assignedGuestId: assignedGuest?.id || "",
        assignedGuestName,
        assignedGroup: assignedGuest?.group || "",
        assignedAt: new Date().toISOString(),
      };

      await store.setJSON(responseId, updated, {
        metadata: {
          responseId,
          attending: String(updated.attending),
          assigned: String(Boolean(updated.assignedGuestId || updated.assignedGuestName)),
        },
      });

      return json(200, { ok: true, response: updated });
    }

    if (event.httpMethod !== "POST") {
      return json(405, { error: "Metoda není podporovaná." });
    }

    const payload = JSON.parse(event.body || "{}");
    const guestName = normalizeText(payload.guestName, 160);

    if (guestName.length < 2) {
      return json(400, { error: "Napište prosím své jméno." });
    }

    if (typeof payload.attending !== "boolean") {
      return json(400, { error: "Vyberte prosím, jestli dorazíte." });
    }

    const responseId = randomUUID();
    const response = {
      responseId,
      guestName,
      attending: payload.attending,
      plusOne: normalizeText(payload.plusOne, 160),
      dietary: normalizeText(payload.dietary, 300),
      note: normalizeText(payload.note, 500),
      assignedGuestId: "",
      assignedGuestName: "",
      assignedGroup: "",
      submittedAt: new Date().toISOString(),
    };

    const store = getStoreInstance();
    await store.setJSON(responseId, response, {
      metadata: {
        responseId,
        attending: String(response.attending),
      },
    });

    return json(200, { ok: true, response });
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : "Neočekávaná chyba." });
  }
}
