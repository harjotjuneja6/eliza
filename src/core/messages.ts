import { AgentRuntime } from "./runtime.ts";
import { type Actor, type Content, type Memory, type UUID } from "./types.ts";

/**
 * Get details for a list of actors.
 */
export async function getActorDetails({
  runtime,
  room_id,
}: {
  runtime: AgentRuntime;
  room_id: UUID;
}) {
  const participantIds =
    await runtime.databaseAdapter.getParticipantsForRoom(room_id);
  const actors = await Promise.all(
    participantIds.map(async (user_id) => {
      const account = await runtime.databaseAdapter.getAccountById(user_id);
      if (account) {
        return {
          id: account.id,
          name: account.name,
          username: account.username,
          details: account.details,
        };
      }
      return null;
    }),
  );

  return actors.filter((actor): actor is Actor => actor !== null);
}

/**
 * Format actors into a string
 * @param actors - list of actors
 * @returns string
 */
export function formatActors({ actors }: { actors: Actor[] }) {
  const actorStrings = actors.map((actor: Actor) => {
    const header = `${actor.name}${actor.details?.tagline ? ": " + actor.details?.tagline : ""}${actor.details?.summary ? "\n" + actor.details?.summary : ""}`;
    return header;
  });
  const finalActorStrings = actorStrings.join("\n");
  return finalActorStrings;
}

/**
 * Format messages into a string
 * @param messages - list of messages
 * @param actors - list of actors
 * @returns string
 */
let serverClientTimeDiff = 0;

export const syncServerTime = (serverTime: string) => {
  const serverDate = new Date(serverTime);
  const clientDate = new Date();
  serverClientTimeDiff = serverDate.getTime() - clientDate.getTime();
  console.log(
    "Time difference between server and client:",
    serverClientTimeDiff,
    "ms",
  );
};

export const formatMessages = ({
  messages,
  actors,
}: {
  messages: Memory[];
  actors: Actor[];
}) => {
  const messageStrings = messages
    .reverse()
    .filter((message: Memory) => message.user_id)
    .map((message: Memory) => {
      let messageContent = (message.content as Content).text;
      const messageAction = (message.content as Content).action;
      const formattedName =
        actors.find((actor: Actor) => actor.id === message.user_id)?.name ||
        "Unknown User";

      const attachments = (message.content as Content).attachments;

      const attachmentString =
        attachments && attachments.length > 0
          ? ` (Attachments: ${attachments.map((media) => `[${media.id} - ${media.title} (${media.url})]`).join(", ")})`
          : "";

      const timestamp = formatTimestamp(message.created_at);

      const shortId = message.user_id.slice(-5);

      return `(${timestamp}) [${shortId}] ${formattedName}: ${messageContent}${attachmentString}${messageAction && messageAction !== "null" ? ` (${messageAction})` : ""}`;
    })
    .join("\n");
  return messageStrings;
};

export const formatTimestamp = (messageDate: Date) => {
  const clientNow = new Date();
  const serverNow = new Date(clientNow.getTime() + serverClientTimeDiff);

  // what type of object is messageDate?
  console.log("messageDate", messageDate);
  console.log(typeof messageDate);

  // if messageDate is a string, convert it to a date
  if (typeof messageDate === "string") {
    messageDate = new Date(messageDate);
  }

  // Adjust for the 7-hour difference
  messageDate = new Date(messageDate.getTime() - 7 * 60 * 60 * 1000);

  const diff = serverNow.getTime() - messageDate.getTime();

  const absDiff = Math.abs(diff);
  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (absDiff < 60000) {
    // Within 1 minute
    return "just now";
  } else if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  } else {
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }
};
