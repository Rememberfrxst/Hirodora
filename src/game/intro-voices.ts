import wake from "../assets/audio/intro/cellmate-wakeup.mp3";
import door from "../assets/audio/intro/cellmate-door.mp3";
import escape from "../assets/audio/intro/player-escape.mp3";
import stay from "../assets/audio/intro/guard-stay-down.mp3";
import dead from "../assets/audio/intro/guard-dead.mp3";
import keyMissing from "../assets/audio/intro/guard-key-missing.mp3";
import manifest from "../assets/audio/intro-voice-manifest.json";
export const introVoiceURLs: Record<string, string> = {
  "cellmate-wakeup": wake,
  "cellmate-door": door,
  "player-escape": escape,
  "guard-stay-down": stay,
  "guard-dead": dead,
  "guard-key-missing": keyMissing,
};
export const introVoiceCues = manifest.sources;
