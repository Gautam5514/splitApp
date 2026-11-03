import { router } from "expo-router";
import { autopilotPromptFrom, uuid } from "./autopilot";

// Open Autopilot, optionally inside a group and/or with a draft to review. A fresh `k`
// makes a second open with the same draft still replace what's in the box.
export function openAutopilot({ groupId, prompt } = {}) {
  router.push({ pathname: "/autopilot", params: { ...(groupId ? { groupId: String(groupId) } : {}), ...(prompt ? { prompt: String(prompt).slice(0, 500) } : {}), k: uuid().slice(0, 8) } });
}

// Tips link to the web's "/dashboard?autopilot=1&prompt=..."; in the app that means
// "open Autopilot with this draft". Returns false for any other link.
export function openAutopilotFromLink(link) {
  const prompt = autopilotPromptFrom(link);
  if (prompt === null) return false;
  const groupId = link.match(/[?&]groupId=([a-f\d]{24})/i)?.[1];
  openAutopilot({ prompt, groupId });
  return true;
}
