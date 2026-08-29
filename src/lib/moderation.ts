import { useChatStore } from "../store/chatStore";
import { LOCAL_PLAYER, useModerationStore } from "../store/moderationStore";
import { useToastStore } from "../store/toastStore";

let installed = false;

/**
 * Wrap chatStore.send so mute/ban apply without editing ChatSidebar.
 * Chat UIs can also call `canChat(name)` from `useModerationStore` before posting.
 */
export function installChatModeration(): void {
  if (installed) return;
  installed = true;
  const original = useChatStore.getState().send;
  useChatStore.setState({
    send: (text: string) => {
      const mod = useModerationStore.getState();
      if (mod.isBanned(LOCAL_PLAYER)) {
        useToastStore.getState().push("This demo account is banned from chat.", "danger");
        return;
      }
      if (mod.isMuted(LOCAL_PLAYER)) {
        useToastStore.getState().push("You are muted and cannot send chat.", "warning");
        return;
      }
      original(text);
    },
  });
}
