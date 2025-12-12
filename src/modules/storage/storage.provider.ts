export interface StorageProvider {
  uploadFile(params: {
    buffer: Buffer;
    filename: string;
    mimeType?: string;
  }): Promise<{ url: string; path: string }>;
}
