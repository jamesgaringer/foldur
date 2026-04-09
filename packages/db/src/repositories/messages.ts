import type Database from "@tauri-apps/plugin-sql";
import type { Message, NewMessage } from "@foldur/core";
import { MessageSchema, generateId, nowISO } from "@foldur/core";

export async function createMessage(
  db: Database,
  message: NewMessage,
): Promise<Message> {
  const id = generateId();
  const now = nowISO();
  await db.execute(
    `INSERT INTO messages
     (id, session_id, role, author_label, timestamp, content_text, content_hash, raw_payload_json, sort_order, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      message.session_id,
      message.role,
      message.author_label,
      message.timestamp,
      message.content_text,
      message.content_hash,
      message.raw_payload_json,
      message.sort_order,
      now,
      now,
    ],
  );

  return MessageSchema.parse({ id, ...message, created_at: now, updated_at: now });
}

export async function createMessages(
  db: Database,
  messages: NewMessage[],
): Promise<Message[]> {
  const created: Message[] = [];
  for (const message of messages) {
    created.push(await createMessage(db, message));
  }
  return created;
}

export async function getMessagesBySession(
  db: Database,
  sessionId: string,
): Promise<Message[]> {
  const rows = await db.select<Message[]>(
    "SELECT * FROM messages WHERE session_id = $1 ORDER BY sort_order",
    [sessionId],
  );
  return rows.map((r) => MessageSchema.parse(r));
}
