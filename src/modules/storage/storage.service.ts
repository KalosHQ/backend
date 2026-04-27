import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { StorageProvider } from './storage.provider';
import { S3StorageProvider } from './s3-storage.provider';
import { AppConfigService } from '../../config/config.service';

const PRIVATE_UPLOAD_EXPIRY_SECONDS = 600;
const PRIVATE_DOWNLOAD_EXPIRY_SECONDS = 3600;
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const PRIVATE_FOLDERS = new Set([
  'avatars',
  'wardrobe/raw',
  'wardrobe/processed',
  'ai/temp',
]);
const PUBLIC_FOLDERS = new Set(['tryon', 'feed', 'products']);
const ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.glb',
  '.gltf',
  '.obj',
]);
const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.obj': 'model/obj',
};

@Injectable()
export class StorageService {
  private readonly provider: StorageProvider;
  private readonly privateBucket: string;
  private readonly publicBucket: string;

  constructor(private readonly config: AppConfigService) {
    this.privateBucket = this.config.getS3PrivateBucket();
    this.publicBucket = this.config.getS3PublicBucket();

    const s3Client = new S3Client({
      region: this.config.getAwsRegion(),
      credentials:
        this.config.getAwsAccessKeyId() && this.config.getAwsSecretAccessKey()
          ? {
              accessKeyId: this.config.getAwsAccessKeyId() as string,
              secretAccessKey: this.config.getAwsSecretAccessKey() as string,
            }
          : undefined,
    });

    const providerName = this.config.getStorageProvider();
    switch (providerName) {
      case 's3':
      default:
        this.provider = new S3StorageProvider(s3Client);
        break;
    }
  }

  async uploadFile(params: {
    buffer: Buffer;
    filename: string;
    mimeType?: string;
    key?: string;
    bucket?: string;
  }) {
    const ext = this.extractExtension(params.filename);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        `Unsupported file extension: ${ext}. Allowed: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`,
      );
    }
    if (params.buffer.byteLength > MAX_UPLOAD_SIZE_BYTES) {
      throw new BadRequestException(
        'File exceeds maximum allowed size of 10MB',
      );
    }

    try {
      return await this.provider.uploadFile({
        ...params,
        bucket: params.bucket ?? this.privateBucket,
        mimeType: params.mimeType ?? MIME_BY_EXTENSION[ext],
      });
    } catch {
      throw new InternalServerErrorException(
        'Failed to upload file to storage',
      );
    }
  }

  async generatePrivateUploadUrl(params: {
    folder: string;
    filename: string;
    fileSize?: number;
  }) {
    this.assertPrivateFolder(params.folder);
    this.assertFilename(params.filename);
    const ext = this.extractExtension(params.filename);

    if (params.fileSize && params.fileSize > MAX_UPLOAD_SIZE_BYTES) {
      throw new BadRequestException(
        'File exceeds maximum allowed size of 10MB',
      );
    }

    const key = `${params.folder}/${params.filename}`;
    try {
      const uploadUrl = await this.provider.generateUploadUrl({
        bucket: this.privateBucket,
        key,
        contentType: MIME_BY_EXTENSION[ext],
        expiresInSeconds: PRIVATE_UPLOAD_EXPIRY_SECONDS,
        contentLength: params.fileSize,
      });

      return {
        upload_url: uploadUrl,
        file_key: key,
        file_url: this.getBucketHttpsUrl(this.privateBucket, key),
      };
    } catch {
      throw new InternalServerErrorException('Failed to generate upload URL');
    }
  }

  async generatePrivateSignedDownloadUrl(fileKey: string) {
    this.assertPrivateKey(fileKey);
    try {
      const url = await this.provider.generateDownloadUrl({
        bucket: this.privateBucket,
        key: fileKey,
        expiresInSeconds: PRIVATE_DOWNLOAD_EXPIRY_SECONDS,
      });
      return { url };
    } catch {
      throw new InternalServerErrorException('Failed to generate signed URL');
    }
  }

  async resolvePrivateFileUrl(pathOrKey: string): Promise<string> {
    if (pathOrKey.startsWith('http://') || pathOrKey.startsWith('https://')) {
      return pathOrKey;
    }

    if (pathOrKey.startsWith('s3://')) {
      const parsed = this.parseS3Uri(pathOrKey);
      if (!parsed) {
        throw new BadRequestException('Invalid S3 path format');
      }
      if (parsed.bucket === this.publicBucket) {
        return this.getBucketHttpsUrl(parsed.bucket, parsed.key);
      }
      if (parsed.bucket !== this.privateBucket) {
        throw new BadRequestException('Unsupported private bucket path');
      }
      const signed = await this.generatePrivateSignedDownloadUrl(parsed.key);
      return signed.url;
    }

    const signed = await this.generatePrivateSignedDownloadUrl(pathOrKey);
    return signed.url;
  }

  async deleteFile(params: { key: string; bucket: 'private' | 'public' }) {
    const bucket =
      params.bucket === 'public' ? this.publicBucket : this.privateBucket;
    try {
      await this.provider.deleteFile({ bucket, key: params.key });
      return { success: true };
    } catch {
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  getPublicFileUrl(key: string): string {
    const [folder] = key.split('/');
    if (!PUBLIC_FOLDERS.has(folder ?? '')) {
      throw new BadRequestException(
        `Invalid public folder. Allowed folders: ${Array.from(PUBLIC_FOLDERS).join(', ')}`,
      );
    }
    return this.getBucketHttpsUrl(this.publicBucket, key);
  }

  private assertPrivateFolder(folder: string) {
    if (!PRIVATE_FOLDERS.has(folder)) {
      throw new BadRequestException(
        `Invalid private folder. Allowed folders: ${Array.from(PRIVATE_FOLDERS).join(', ')}`,
      );
    }
  }

  private assertPrivateKey(fileKey: string) {
    const [folder] = fileKey.split('/');
    if (!folder) {
      throw new BadRequestException('Invalid file key');
    }
    if (folder === 'wardrobe') {
      const [top, subFolder] = fileKey.split('/');
      const combined = `${top}/${subFolder ?? ''}`;
      if (!PRIVATE_FOLDERS.has(combined)) {
        throw new BadRequestException('Invalid private storage path');
      }
      return;
    }
    if (!PRIVATE_FOLDERS.has(folder)) {
      throw new BadRequestException('Invalid private storage path');
    }
  }

  private assertFilename(filename: string) {
    if (!filename || filename.includes('/') || filename.includes('\\')) {
      throw new BadRequestException(
        'Filename must not include path separators',
      );
    }
    this.extractExtension(filename);
  }

  private extractExtension(filename: string): string {
    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex === -1) {
      throw new BadRequestException('Filename must include a valid extension');
    }
    const ext = filename.slice(dotIndex).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        `Unsupported file extension: ${ext}. Allowed: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`,
      );
    }
    return ext;
  }

  private getBucketHttpsUrl(bucket: string, key: string): string {
    return `https://${bucket}.s3.amazonaws.com/${key}`;
  }

  private parseS3Uri(uri: string): { bucket: string; key: string } | null {
    const trimmed = uri.trim();
    if (!trimmed.startsWith('s3://')) return null;
    const withoutScheme = trimmed.slice('s3://'.length);
    const slashIndex = withoutScheme.indexOf('/');
    if (slashIndex <= 0) return null;
    const bucket = withoutScheme.slice(0, slashIndex);
    const key = withoutScheme.slice(slashIndex + 1);
    if (!bucket || !key) return null;
    return { bucket, key };
  }
}
