const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const express = require("express");
const upload = require("../middlewares/upload");
const { OUTPUT_DIR } = require("../config/constants");
const {
  getMediaTypeByExtension,
  isValidOutputFormat,
  isValidQuality
} = require("../utils/fileValidation");
const { createJob, getJob, updateJob } = require("../services/jobStore");
const {
  buildOutputFileName,
  getFriendlyConversionError,
  runConversion,
  validateInputForOutput
} = require("../services/conversionService");
const { deleteIfExists } = require("../utils/cleanup");

const router = express.Router();

router.get("/formats", (_req, res) => {
  res.json({
    videoFormats: ["mp4", "avi", "mkv", "webm", "mov"],
    audioFormats: ["mp3", "wav", "aac", "flac", "m4a"],
    qualities: ["low", "medium", "high"]
  });
});

router.post("/convert", upload.array("media"), async (req, res, next) => {
  try {
    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).json({ error: "No media files were uploaded." });
    }

    const requestedFormat = String(req.body.outputFormat || "").toLowerCase();
    const outputType = String(req.body.outputType || "").toLowerCase();
    const quality = String(req.body.quality || "medium").toLowerCase();

    if (!["audio", "video"].includes(outputType)) {
      await Promise.all(files.map((file) => deleteIfExists(file.path)));
      return res.status(400).json({ error: "outputType must be either audio or video." });
    }

    if (!isValidOutputFormat(requestedFormat, outputType)) {
      await Promise.all(files.map((file) => deleteIfExists(file.path)));
      return res.status(400).json({ error: "Invalid output format for requested output type." });
    }

    if (!isValidQuality(quality)) {
      await Promise.all(files.map((file) => deleteIfExists(file.path)));
      return res.status(400).json({ error: "Invalid quality. Use low, medium, or high." });
    }

    const jobs = [];

    for (const file of files) {
      const inputType = getMediaTypeByExtension(file.originalname);

      if (!inputType) {
        await deleteIfExists(file.path);
        continue;
      }

      if (inputType === "audio" && outputType === "video") {
        await deleteIfExists(file.path);
        continue;
      }

      const validationError = await validateInputForOutput({
        inputPath: file.path,
        outputType
      });

      if (validationError) {
        const jobId = randomUUID();
        const outputFileName = buildOutputFileName(file.originalname, requestedFormat);

        createJob({
          id: jobId,
          inputPath: null,
          outputPath: null,
          inputFileName: file.originalname,
          outputFileName,
          details: {
            inputType,
            outputType,
            outputFormat: requestedFormat,
            quality
          }
        });

        updateJob(jobId, {
          status: "failed",
          progress: 0,
          error: validationError,
          downloadReady: false
        });

        await deleteIfExists(file.path);

        jobs.push({
          jobId,
          inputFileName: file.originalname,
          outputFileName,
          statusUrl: `/api/jobs/${jobId}`,
          downloadUrl: `/api/download/${jobId}`
        });

        continue;
      }

      const outputFileName = buildOutputFileName(file.originalname, requestedFormat);
      const outputPath = path.join(OUTPUT_DIR, `${randomUUID()}_${outputFileName}`);
      const jobId = randomUUID();

      createJob({
        id: jobId,
        inputPath: file.path,
        outputPath,
        inputFileName: file.originalname,
        outputFileName,
        details: {
          inputType,
          outputType,
          outputFormat: requestedFormat,
          quality
        }
      });

      runConversion(
        {
          inputPath: file.path,
          outputPath,
          outputType,
          outputFormat: requestedFormat,
          quality
        },
        {
          onStart: () => {
            updateJob(jobId, { status: "processing", progress: 0 });
          },
          onProgress: (progress) => {
            const percent = Math.max(0, Math.min(100, Math.floor(progress?.percent || 0)));
            updateJob(jobId, { status: "processing", progress: percent });
          },
          onError: async (error) => {
            await deleteIfExists(outputPath);
            updateJob(jobId, {
              status: "failed",
              error: getFriendlyConversionError(error.message),
              progress: 0,
              downloadReady: false
            });
          },
          onEnd: () => {
            updateJob(jobId, {
              status: "completed",
              progress: 100,
              downloadReady: true
            });
          }
        }
      );

      jobs.push({
        jobId,
        inputFileName: file.originalname,
        outputFileName,
        statusUrl: `/api/jobs/${jobId}`,
        downloadUrl: `/api/download/${jobId}`
      });
    }

    if (jobs.length === 0) {
      return res.status(400).json({ error: "No valid files to convert for the selected output type/format." });
    }

    return res.status(202).json({
      message: `Started ${jobs.length} conversion job(s).`,
      jobs
    });
  } catch (error) {
    if (req.files?.length) {
      await Promise.all(req.files.map((file) => deleteIfExists(file.path)));
    }
    next(error);
  }
});

router.get("/jobs/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({ error: "Job not found." });
  }

  return res.json({
    jobId: job.id,
    inputFileName: job.inputFileName,
    status: job.status,
    progress: job.progress,
    error: job.error,
    outputFileName: job.outputFileName,
    details: job.details,
    expiresAt: job.expiresAt,
    downloadUrl: job.downloadReady ? `/api/download/${job.id}` : null
  });
});

router.get("/download/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({ error: "Job not found." });
  }

  if (job.status !== "completed" || !job.downloadReady) {
    return res.status(409).json({ error: "File is not ready for download." });
  }

  if (!fs.existsSync(job.outputPath)) {
    return res.status(404).json({ error: "Converted file was not found." });
  }

  return res.download(job.outputPath, job.outputFileName);
});

module.exports = router;
