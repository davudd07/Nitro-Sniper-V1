import { useIdentityStore } from "../store/identityStore";

/** True when this name currently has the Owner visual role. */
export function isOwnerName(name: string): boolean {
  return useIdentityStore.getState().roleFor(name) === "owner";
}

/** True when the local signed-in player is Owner. */
export function isLocalOwner(): boolean {
  return isOwnerName("You");
}
