import multer from 'multer';

const AUDIO_MIME_OK = (mime: string) =>
  mime.startsWith('audio/') || mime === 'video/webm' || mime === 'video/mp4';
const AUDIO_EXTENSIONS = /\.(webm|wav|mp3|m4a|ogg|mpeg|mpga|mp4)$/i;

/**
 * In-memory upload for Whisper transcription (gig brief audio).
 * Whisper hard-limit is 25MB — keep a small safety margin.
 */
export const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 24 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mimeOk = AUDIO_MIME_OK(file.mimetype || '');
    const nameOk = AUDIO_EXTENSIONS.test(file.originalname || '');
    if (mimeOk || nameOk) {
      cb(null, true);
      return;
    }
    cb(new Error(`Unsupported audio type: ${file.mimetype || file.originalname}`));
  },
});
