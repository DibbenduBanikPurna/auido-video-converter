const path = require("path");

const BASE_STORAGE_DIR = path.join(__dirname, "..", "..", "storage");
const UPLOAD_DIR = path.join(BASE_STORAGE_DIR, "uploads");
const OUTPUT_DIR = path.join(BASE_STORAGE_DIR, "outputs");

const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB
const MAX_BATCH_FILES = 20;
const FILE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const ALLOWED_EXTENSIONS = new Set([
  ".mp4",
  ".avi",
  ".mov",
  ".mkv",
  ".webm",
  ".mp3",
  ".wav",
  ".aac",
  ".flac",
  ".m4a"
]);

const VIDEO_FORMATS = new Set(["mp4", "avi", "mkv", "webm", "mov"]);
const AUDIO_FORMATS = new Set(["mp3", "wav", "aac", "flac", "m4a"]);

const QUALITY_PRESETS = {
  low: {
    videoCrf: 30,
    videoPreset: "veryfast",
    audioBitrate: "96k"
  },
  medium: {
    videoCrf: 24,
    videoPreset: "medium",
    audioBitrate: "160k"
  },
  high: {
    videoCrf: 19,
    videoPreset: "slow",
    audioBitrate: "256k"
  }
};

module.exports = {
  UPLOAD_DIR,
  OUTPUT_DIR,
  MAX_FILE_SIZE_BYTES,
  MAX_BATCH_FILES,
  FILE_TTL_MS,
  CLEANUP_INTERVAL_MS,
  ALLOWED_EXTENSIONS,
  VIDEO_FORMATS,
  AUDIO_FORMATS,
  QUALITY_PRESETS
};
