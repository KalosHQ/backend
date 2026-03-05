/* eslint-disable @typescript-eslint/require-await */
import { StorageProvider } from './storage.provider';

export class S3StorageProvider implements StorageProvider {
  constructor(private readonly bucket: string) {}

  async uploadFile(params: {
    buffer: Buffer;
    filename: string;
    mimeType?: string;
  }): Promise<{ url: string; path: string }> {
    // Placeholder implementation to avoid SDK dependency; wire real S3 client as needed.
    const path = `s3://${this.bucket}/${params.filename}`;
    return { url: path, path };
  }
}
