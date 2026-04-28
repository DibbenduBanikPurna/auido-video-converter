const path = require("path");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;
const ffmpeg = require("fluent-ffmpeg");
const { QUALITY_PRESETS } = require("../config/constants");

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

function toSafeBaseName(fileName) {
  const ext = path.extname(fileName);
  return path.basename(fileName, ext).replace(/[^a-zA-Z0-9-_]/g, "_");
}

function buildOutputFileName(inputFileName, outputFormat) {
  return `${toSafeBaseName(inputFileName)}_converted.${outputFormat}`;
}

function buildFfmpegCommand({ inputPath, outputPath, outputType, outputFormat, quality }) {
  const qualityPreset = QUALITY_PRESETS[quality];
  const command = ffmpeg(inputPath).output(outputPath);

  if (outputType === "video") {
    command
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([`-preset ${qualityPreset.videoPreset}`, `-crf ${qualityPreset.videoCrf}`]);

    if (outputFormat === "webm") {
      command.videoCodec("libvpx-vp9").audioCodec("libopus");
    }

    if (outputFormat === "avi") {
      command.videoCodec("mpeg4").audioCodec("libmp3lame");
    }

    if (outputFormat === "mkv") {
      command.videoCodec("libx264").audioCodec("aac");
    }

    if (outputFormat === "mov") {
      command.videoCodec("libx264").audioCodec("aac");
    }
  }

  if (outputType === "audio") {
    command.noVideo().audioBitrate(qualityPreset.audioBitrate);

    if (outputFormat === "aac" || outputFormat === "m4a") {
      command.audioCodec("aac");
    } else if (outputFormat === "wav") {
      command.audioCodec("pcm_s16le");
    } else if (outputFormat === "flac") {
      command.audioCodec("flac");
    } else {
      command.audioCodec("libmp3lame");
    }
  }

  return command.toFormat(outputFormat);
}

function runConversion(config, handlers) {
  const command = buildFfmpegCommand(config)
    .on("start", handlers.onStart)
    .on("progress", handlers.onProgress)
    .on("error", handlers.onError)
    .on("end", handlers.onEnd);

  command.run();
}

function probeInput(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (error, metadata) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(metadata);
    });
  });
}

async function validateInputForOutput({ inputPath, outputType }) {
  try {
    const metadata = await probeInput(inputPath);
    const streams = metadata?.streams || [];

    if (outputType === "audio") {
      const hasAudio = streams.some((stream) => stream.codec_type === "audio");
      if (!hasAudio) {
        return "This file has no audio track. Choose video output or upload media that contains audio.";
      }
    }

    return null;
  } catch (_error) {
    return "Could not inspect input media streams. The file may be corrupted or unsupported.";
  }
}

function getFriendlyConversionError(message = "") {
  const text = String(message || "").toLowerCase();

  if (
    text.includes("does not contain any stream") ||
    text.includes("matches no streams") ||
    text.includes("output file #0 does not contain any stream")
  ) {
    return "No audio stream was found in this file. Choose video output or upload media that contains audio.";
  }

  if (text.includes("invalid data found when processing input")) {
    return "The uploaded file appears corrupted or unsupported by FFmpeg.";
  }

  if (text.includes("unknown encoder") || text.includes("encoder not found")) {
    return "Required encoder is not available in the current FFmpeg build.";
  }

  return message || "Conversion failed.";
}

module.exports = {
  buildOutputFileName,
  validateInputForOutput,
  runConversion,
  getFriendlyConversionError
};
