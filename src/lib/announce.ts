/** Bump the id when the message changes, so people who dismissed the old one see the new one. */
export const ANNOUNCE_ID = "ai-agents-llm-2026";
export const ANNOUNCE_KEY = "devqna-announce-dismissed";

/**
 * Runs before first paint (inlined in <head>) so a dismissed bar never flashes
 * or shifts the layout: it marks <html> and CSS hides the bar.
 */
export const ANNOUNCE_HIDE_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(ANNOUNCE_KEY)})===${JSON.stringify(ANNOUNCE_ID)})document.documentElement.setAttribute("data-announce-dismissed","")}catch(e){}`;
