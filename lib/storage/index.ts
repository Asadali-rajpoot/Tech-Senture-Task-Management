import fs from "fs/promises";
import path from "path";

export interface UploadResult {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface StorageProvider {
  upload(file: File, customName?: string): Promise<UploadResult>;
  delete(fileUrl: string): Promise<void>;
}

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB (Open Question #5 resolution)

/**
 * Local Disk Storage Provider
 * Saves files to public/uploads directory for local dev & production serving
 */
export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), "public", "uploads");
  }

  private async ensureDirectory() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch {
      // Directory already exists or cannot be created
    }
  }

  async upload(file: File, customName?: string): Promise<UploadResult> {
    await this.ensureDirectory();

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File exceeds the maximum allowed size of 25MB.`);
    }

    const originalName = customName || file.name || "unnamed-file";
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const uniqueFileName = `${baseName}-${uniqueSuffix}${extension}`;

    const filePath = path.join(this.uploadDir, uniqueFileName);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.writeFile(filePath, buffer);

    const fileUrl = `/uploads/${uniqueFileName}`;

    return {
      fileName: originalName,
      fileUrl,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
    };
  }

  async delete(fileUrl: string): Promise<void> {
    try {
      if (!fileUrl.startsWith("/uploads/")) return;
      const fileName = fileUrl.replace("/uploads/", "");
      // Prevent directory traversal
      const safeFileName = path.basename(fileName);
      const filePath = path.join(this.uploadDir, safeFileName);
      await fs.unlink(filePath);
    } catch {
      // File might already be deleted or not found
    }
  }
}

/**
 * Singleton / factory for configured storage provider
 */
let storageProviderInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!storageProviderInstance) {
    storageProviderInstance = new LocalStorageProvider();
  }
  return storageProviderInstance;
}
