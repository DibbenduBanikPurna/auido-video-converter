const { FILE_TTL_MS } = require("../config/constants");

const jobs = new Map();

function createJob(payload) {
  const job = {
    id: payload.id,
    status: "queued",
    progress: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    inputPath: payload.inputPath,
    outputPath: payload.outputPath,
    inputFileName: payload.inputFileName,
    outputFileName: payload.outputFileName,
    details: payload.details,
    error: null,
    downloadReady: false,
    expiresAt: Date.now() + FILE_TTL_MS
  };

  jobs.set(job.id, job);
  return job;
}

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

function updateJob(jobId, patch) {
  const job = jobs.get(jobId);

  if (!job) {
    return null;
  }

  const next = {
    ...job,
    ...patch,
    updatedAt: Date.now()
  };

  jobs.set(jobId, next);
  return next;
}

function removeJob(jobId) {
  jobs.delete(jobId);
}

function getAllJobs() {
  return Array.from(jobs.values());
}

module.exports = {
  createJob,
  getJob,
  updateJob,
  removeJob,
  getAllJobs
};
