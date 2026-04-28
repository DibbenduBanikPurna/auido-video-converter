# Media Forge - Full-Stack Video/Audio Converter

A full-stack web application for converting media with **React + Node.js/Express + FFmpeg**.

## Features

- Upload media files (video/audio): MP4, AVI, MOV, MKV, WEBM, MP3, WAV, AAC, FLAC, M4A
- Convert video formats: MP4, AVI, MKV, WEBM, MOV
- Extract audio from video / convert audio formats: MP3, WAV, AAC, FLAC, M4A
- Quality presets: low, medium, high
- Real-time conversion progress (polled)
- Batch conversion (multiple files per request)
- Download converted files
- Drag-and-drop upload UI
- Upload validation (type + max size)
- Handles large uploads with streaming-to-disk (Multer disk storage)
- Temporary file storage with automatic cleanup

## Project Structure

- `client/` - React (Vite) frontend
- `server/` - Express backend with FFmpeg integration

## Prerequisites

- Node.js 20+ (recommended)
- npm 10+

> FFmpeg binary is included via `ffmpeg-static`, so no global FFmpeg installation is required.

## Setup

1. Install root workspace dependencies (recommended):

```bash
npm install
```

2. Start both backend and frontend from workspace root:

```bash
npm run dev
```

3. Open the app at `http://localhost:5173`

## Manual Setup (Separate Terminals)

1. Install frontend dependencies:
   ```bash
   cd client
   npm install
   ```
2. Install backend dependencies:
   ```bash
   cd ../server
   npm install
   ```
3. Start backend:
   ```bash
   npm run dev
   ```
4. In another terminal, start frontend:
   ```bash
   cd ../client
   npm run dev
   ```
5. Open the app at `http://localhost:5173`

## Environment Variables

### Backend (`server/.env` optional)

- `PORT=5000`
- `CLIENT_ORIGIN=http://localhost:5173`

### Frontend (`client/.env` optional)

- `VITE_API_BASE_URL=http://localhost:5000`

## Example API Endpoints

### Health Check

- `GET /api/health`

Example response:

```json
{
  "status": "ok"
}
```

### Get Supported Formats

- `GET /api/formats`

Example response:

```json
{
  "videoFormats": ["mp4", "avi", "mkv", "webm", "mov"],
  "audioFormats": ["mp3", "wav", "aac", "flac", "m4a"],
  "qualities": ["low", "medium", "high"]
}
```

### Start Conversion

- `POST /api/convert`
- `multipart/form-data` fields:
  - `media`: uploaded file(s), repeat this field for multiple files
  - `outputType`: `video` or `audio`
  - `outputFormat`: e.g. `mp4`, `wav`, `aac`
  - `quality`: `low`, `medium`, `high`

Example cURL:

```bash
curl -X POST http://localhost:5000/api/convert \
  -F "media=@sample.mov" \
  -F "media=@sample2.mp4" \
  -F "outputType=audio" \
  -F "outputFormat=mp3" \
  -F "quality=medium"
```

Example response:

```json
{
  "message": "Started 2 conversion job(s).",
  "jobs": [
    {
      "jobId": "9d8c1b53-7c7d-4f3e-80e2-2fb4ceaf1e2a",
      "inputFileName": "sample.mov",
      "outputFileName": "sample_converted.mp3",
      "statusUrl": "/api/jobs/9d8c1b53-7c7d-4f3e-80e2-2fb4ceaf1e2a",
      "downloadUrl": "/api/download/9d8c1b53-7c7d-4f3e-80e2-2fb4ceaf1e2a"
    }
  ]
}
```

### Check Job Status

- `GET /api/jobs/:jobId`

Example response:

```json
{
  "jobId": "9d8c1b53-7c7d-4f3e-80e2-2fb4ceaf1e2a",
  "status": "processing",
  "progress": 42,
  "error": null,
  "outputFileName": "sample_converted.mp3",
  "details": {
    "inputType": "video",
    "outputType": "audio",
    "outputFormat": "mp3",
    "quality": "medium"
  },
  "expiresAt": 1770000000000,
  "downloadUrl": null
}
```

### Download Converted File

- `GET /api/download/:jobId`

Returns the converted file as an attachment when ready.

## Notes

- Uploaded and converted files are stored in `server/storage/` temporarily.
- Cleanup runs on an interval and removes expired files/jobs automatically.
- Max upload size is set to **1 GB**.
- Max batch size is set to **20 files** per conversion request.
