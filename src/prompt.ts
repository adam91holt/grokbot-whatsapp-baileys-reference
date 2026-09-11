/**
 * Human-readable prompt text. Nothing else goes in sendPrompt.prompt.
 *
 * DM:    {DisplayName}:\n{body}
 * Group: {DisplayName} (in {GroupSubject}):\n{body}
 * Image: same header + caption or [image]
 */

export function imageBody(caption?: string | null): string {
  const trimmed = caption?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : "[image]";
}

export function formatDmPrompt(name: string, body: string): string {
  return `${name}:\n${body}`;
}

export function formatGroupPrompt(name: string, groupSubject: string, body: string): string {
  return `${name} (in ${groupSubject}):\n${body}`;
}

export function formatPrompt(input: {
  displayName: string;
  body: string;
  groupSubject?: string | null;
}): string {
  const name = input.displayName.trim() || "Unknown";
  const body = input.body;
  const subject = input.groupSubject?.trim();
  if (subject) return formatGroupPrompt(name, subject, body);
  return formatDmPrompt(name, body);
}
