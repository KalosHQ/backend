export interface StorageProvider {
  uploadFile(params: {
    buffer: Buffer;
    filename: string;
    mimeType?: string;
    key?: string;
    bucket?: string;
  }): Promise<{ url: string; path: string }>;

  generateUploadUrl(params: {
    bucket: string;
    key: string;
    contentType: string;
    expiresInSeconds: number;
    contentLength?: number;
  }): Promise<string>;

  generateDownloadUrl(params: {
    bucket: string;
    key: string;
    expiresInSeconds: number;
  }): Promise<string>;

  deleteFile(params: { bucket: string; key: string }): Promise<void>;
}
