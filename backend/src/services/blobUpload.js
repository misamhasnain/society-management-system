import { put, get, del } from '@vercel/blob';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';

/**
 * Upload a file to Private Vercel Blob when BLOB_READ_WRITE_TOKEN is set.
 * In local dev (without token), saves to local uploads/temp directory.
 *
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {string} originalName - Original filename
 * @param {string} mime - MIME type
 * @returns {Promise<{storageProvider: 'vercel-blob' | 'local', filePath: string, fileName: string}>}
 */
export const uploadToBlob = async (buffer, originalName, mime) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const ext = path.extname(originalName).toLowerCase();
  const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

  if (token) {
    const result = await put(uniqueName, buffer, {
      access: 'private',
      contentType: mime,
      token,
    });
    return {
      storageProvider: 'vercel-blob',
      filePath: result.pathname,
      fileName: uniqueName,
    };
  }

  // Local development fallback
  const uploadDir = path.resolve(process.cwd(), 'uploads', 'temp');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const localPath = path.join(uploadDir, uniqueName);
  await fs.promises.writeFile(localPath, buffer);
  return {
    storageProvider: 'local',
    filePath: localPath,
    fileName: uniqueName,
  };
};

/**
 * Stream a private blob to an Express response.
 * Uses official @vercel/blob get() with access: 'private'.
 *
 * @param {string} pathname - Blob pathname/key
 * @param {import('express').Response} res - Express response
 * @returns {Promise<boolean>} - True if streamed, false if not found
 */
export const streamBlob = async (pathname, res) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  }

  const result = await get(pathname, {
    access: 'private',
    token,
  });

  if (!result || !result.stream) {
    return false;
  }

  const nodeStream = Readable.fromWeb(result.stream);
  nodeStream.pipe(res);
  return true;
};

/**
 * Delete a file from its storage provider (Vercel Blob or local filesystem).
 *
 * @param {'vercel-blob' | 'local'} storageProvider
 * @param {string} filePath - Blob pathname or local file path
 */
export const deleteFromStorage = async (storageProvider, filePath) => {
  if (!filePath) return;

  if (storageProvider === 'vercel-blob') {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      try {
        await del(filePath, { token });
      } catch (err) {
        console.error('Failed to delete blob from Vercel:', err.message);
      }
    }
  } else if (storageProvider === 'local') {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('Failed to delete local file:', err.message);
    }
  }
};
