import { useMemo, useState } from "react";
import UploadDropzone from "./components/UploadDropzone";
import ProgressBar from "./components/ProgressBar";
import { downloadFile, getJobStatus, startConversion } from "./services/api";
import "./App.css";

const MAX_BATCH_FILES = 20;

const OUTPUT_FORMATS = {
  video: ["mp4", "avi", "mkv", "webm", "mov"],
  audio: ["mp3", "wav", "aac", "flac", "m4a"]
};

function App() {
  const [files, setFiles] = useState([]);
  const [outputType, setOutputType] = useState("video");
  const [outputFormat, setOutputFormat] = useState("mp4");
  const [quality, setQuality] = useState("medium");
  const [isConverting, setIsConverting] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const formatOptions = useMemo(() => OUTPUT_FORMATS[outputType], [outputType]);
  const completedJobs = jobs.filter((job) => job.status === "completed").length;
  const hasTooManyFiles = files.length > MAX_BATCH_FILES;

  function getExtension(fileName = "") {
    const part = fileName.split(".").pop();
    return part ? part.toUpperCase() : "FILE";
  }

  function handleFilesSelected(nextFiles) {
    const uniqueMap = new Map();

    [...files, ...nextFiles].forEach((item) => {
      const key = `${item.name}_${item.size}_${item.lastModified}`;
      uniqueMap.set(key, item);
    });

    const merged = Array.from(uniqueMap.values());
    setFiles(merged);

    if (merged.length > MAX_BATCH_FILES) {
      setError(`You selected ${merged.length} files. Remove ${merged.length - MAX_BATCH_FILES} file(s) to continue (max ${MAX_BATCH_FILES}).`);
    } else {
      setError("");
    }
  }

  function handleRemoveFile(fileToRemove) {
    const next = files.filter(
      (item) => !(item.name === fileToRemove.name && item.size === fileToRemove.size && item.lastModified === fileToRemove.lastModified)
    );

    setFiles(next);

    if (next.length <= MAX_BATCH_FILES) {
      setError("");
    }
  }

  function handleClearFiles() {
    setFiles([]);
    setError("");
  }

  function pollStatus(jobItems) {
    const intervalId = setInterval(async () => {
      try {
        const statuses = await Promise.all(jobItems.map((job) => getJobStatus(job.jobId)));

        const nextJobs = statuses.map((item) => ({
          jobId: item.jobId,
          inputFileName: item.inputFileName,
          outputFileName: item.outputFileName,
          status: item.status,
          progress: item.progress || 0,
          error: item.error,
          downloadReady: item.status === "completed"
        }));

        setJobs(nextJobs);

        const progressAverage = nextJobs.reduce((sum, item) => sum + (item.progress || 0), 0) / nextJobs.length;
        setOverallProgress(Math.floor(progressAverage));

        const anyFailed = nextJobs.some((item) => item.status === "failed");
        const allDone = nextJobs.every((item) => ["completed", "failed"].includes(item.status));

        if (allDone) {
          clearInterval(intervalId);
          setIsConverting(false);
          setStatus(anyFailed ? "completed-with-errors" : "completed");
          if (anyFailed) {
            setError("Some files failed. Check each item below.");
          }
          return;
        }

        setStatus("processing");
      } catch (pollError) {
        clearInterval(intervalId);
        setIsConverting(false);
        setError(pollError.response?.data?.error || "Could not fetch progress status.");
      }
    }, 1000);
  }

  async function handleConvert(event) {
    event.preventDefault();
    setError("");
    setJobs([]);

    if (files.length === 0) {
      setError("Select at least one media file first.");
      return;
    }

    if (files.length > MAX_BATCH_FILES) {
      setError(`Too many files selected. Remove files until you have at most ${MAX_BATCH_FILES}.`);
      return;
    }

    try {
      setIsConverting(true);
      setStatus("queued");
      setOverallProgress(0);

      const data = await startConversion({
        file: files,
        outputType,
        outputFormat,
        quality
      });

      const initialJobs = (data.jobs || []).map((job) => ({
        ...job,
        status: "queued",
        progress: 0,
        error: null,
        downloadReady: false
      }));

      setJobs(initialJobs);
      pollStatus(initialJobs);
    } catch (requestError) {
      setIsConverting(false);
      setStatus("failed");
      setError(requestError.response?.data?.error || "Unable to start conversion.");
    }
  }

  async function handleDownload(job) {
    if (!job?.jobId) {
      return;
    }

    try {
      await downloadFile(job.jobId, job.outputFileName);
    } catch (downloadError) {
      setError(downloadError.response?.data?.error || "Download failed.");
    }
  }

  function handleOutputTypeChange(nextType) {
    setOutputType(nextType);
    setOutputFormat(OUTPUT_FORMATS[nextType][0]);
  }

  return (
    <main className="page-shell">
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <div className="grid-noise" />

      <section className="panel">
        <header className="panel-header">
          <p className="eyebrow">Media Forge</p>
          <h1>Video and Audio Converter</h1>
          <p className="subtitle">Upload once, transcode with FFmpeg, monitor progress, and download the result.</p>
          <div className="meta-pills">
            <span>Fast FFmpeg pipeline</span>
            <span>Large file support</span>
            <span>One-click download</span>
          </div>
        </header>

        <div className="panel-body">
          <div className="left-column">
            <UploadDropzone onFileSelected={handleFilesSelected} disabled={isConverting} />

            {files.length > 0 && (
              <div className="file-card file-list-card">
                <div className="file-list-header">
                  <p className="file-name">
                    {files.length} file(s) selected (max {MAX_BATCH_FILES})
                  </p>
                  <button type="button" className="text-button" onClick={handleClearFiles} disabled={isConverting}>
                    Clear all
                  </button>
                </div>
                <ul className="file-list">
                  {files.map((item) => (
                    <li key={`${item.name}-${item.lastModified}`}>
                      <span className="file-item-name">{item.name}</span>
                      <div className="file-item-actions">
                        <span className="file-meta">{(item.size / (1024 * 1024)).toFixed(2)} MB</span>
                        <button type="button" className="chip-button" onClick={() => handleRemoveFile(item)} disabled={isConverting}>
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <form className="controls" onSubmit={handleConvert}>
            <div className="control-grid">
              <label>
                Output Type
                <select value={outputType} onChange={(e) => handleOutputTypeChange(e.target.value)} disabled={isConverting}>
                  <option value="video">Video Conversion</option>
                  <option value="audio">Extract / Convert Audio</option>
                </select>
              </label>

              <label>
                Output Format
                <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} disabled={isConverting}>
                  {formatOptions.map((format) => (
                    <option key={format} value={format}>
                      {format.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>

              <label className="label-span-2">
                Quality
                <select value={quality} onChange={(e) => setQuality(e.target.value)} disabled={isConverting}>
                  <option value="low">Low (faster, smaller)</option>
                  <option value="medium">Medium (balanced)</option>
                  <option value="high">High (better fidelity)</option>
                </select>
              </label>
            </div>

            <button type="submit" disabled={isConverting || files.length === 0 || hasTooManyFiles}>
              {isConverting ? "Converting..." : "Start Conversion"}
            </button>
          </form>
        </div>

        {(isConverting || jobs.length > 0) && (
          <div className="status-block">
            <div className="status-line">
              <span>Status: {status}</span>
              <span>
                Done: {completedJobs}/{jobs.length}
              </span>
            </div>
            <ProgressBar value={overallProgress} />
          </div>
        )}

        {error && <p className="feedback feedback-error">{error}</p>}

        {jobs.length > 0 && (
          <div className="jobs-grid">
            {jobs.map((job) => (
              <article key={job.jobId} className="download-card job-card">
                <p className="job-title">{job.inputFileName}</p>
                <p className="job-output">{job.outputFileName}</p>
                <p className="job-conversion">
                  {getExtension(job.inputFileName)} to {getExtension(job.outputFileName)}
                </p>
                <p className="job-status">{job.status}</p>
                <ProgressBar value={job.progress} />
                {job.error && <p className="feedback feedback-error">{job.error}</p>}
                <button type="button" onClick={() => handleDownload(job)} disabled={!job.downloadReady}>
                  Download {getExtension(job.outputFileName)}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
