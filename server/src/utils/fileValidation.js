const path = require("path");
const {
  ALLOWED_EXTENSIONS,
  VIDEO_FORMATS,
  AUDIO_FORMATS,
  QUALITY_PRESETS
} = require("../config/constants");

function getExtension(fileName = "") {
  return path.extname(fileName).toLowerCase();
}

function isAllowedInputFile(fileName = "") {
  return ALLOWED_EXTENSIONS.has(getExtension(fileName));
}

function getMediaTypeByExtension(fileName = "") {
  const ext = getExtension(fileName).replace(".", "");

  if (VIDEO_FORMATS.has(ext)) {
    return "video";
  }

  if (AUDIO_FORMATS.has(ext)) {
    return "audio";
  }

  return null;
}

function isValidOutputFormat(format = "", outputType = "") {
  if (outputType === "video") {
    return VIDEO_FORMATS.has(format);
  }

  if (outputType === "audio") {
    return AUDIO_FORMATS.has(format);
  }

  return false;
}

function isValidQuality(quality = "") {
  return Object.prototype.hasOwnProperty.call(QUALITY_PRESETS, quality);
}

module.exports = {
  getExtension,
  isAllowedInputFile,
  getMediaTypeByExtension,
  isValidOutputFormat,
  isValidQuality
};
