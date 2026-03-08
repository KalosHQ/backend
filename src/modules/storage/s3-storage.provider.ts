import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider } from './storage.provider';

export class S3StorageProvider implements StorageProvider {
  constructor(private readonly client: S3Client) {}

  async uploadFile(params: {
    buffer: Buffer;
    filename: string;
    mimeType?: string;
    key?: string;
    bucket?: string;
  }): Promise<{ url: string; path: string }> {
    if (!params.bucket) {
      throw new Error('Bucket is required for S3 upload');
    }

    const key = params.key ?? params.filename;
    await this.client.send(
      new PutObjectCommand({
        Bucket: params.bucket,
        Key: key,
        Body: params.buffer,
        ContentType: params.mimeType,
      }),
    );

    const path = `s3://${params.bucket}/${key}`;
    return { url: path, path };
  }

  async generateUploadUrl(params: {
    bucket: string;
    key: string;
    contentType: string;
    expiresInSeconds: number;
    contentLength?: number;
  }): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      ContentType: params.contentType,
      ContentLength: params.contentLength,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: params.expiresInSeconds,
    });
  }

  async generateDownloadUrl(params: {
    bucket: string;
    key: string;
    expiresInSeconds: number;
  }): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: params.expiresInSeconds,
    });
  }

  async deleteFile(params: { bucket: string; key: string }): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: params.bucket,
        Key: params.key,
      }),
    );
  }
}
