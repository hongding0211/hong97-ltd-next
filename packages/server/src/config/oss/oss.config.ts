import { registerAs } from '@nestjs/config'

export default registerAs('oss', () => ({
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
  region: process.env.OSS_REGION,
  standardUploadMaxBytes: process.env.OSS_STANDARD_UPLOAD_MAX_BYTES
    ? parseInt(process.env.OSS_STANDARD_UPLOAD_MAX_BYTES)
    : 20 * 1024 * 1024,
  uploadPolicyTtlSeconds: process.env.OSS_UPLOAD_POLICY_TTL_SECONDS
    ? parseInt(process.env.OSS_UPLOAD_POLICY_TTL_SECONDS)
    : 60,
}))
