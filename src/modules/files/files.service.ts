// src/files/user.service.ts
import {Injectable} from '@nestjs/common';
import {GetObjectCommand, PutObjectCommand} from '@aws-sdk/client-s3';
import {v4 as uuidv4} from 'uuid';
import {s3Client} from "../../common/aws/awsS3Client";
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';

@Injectable()
export class FilesService {
    /**
     * Uploads a file to the specified AWS S3 bucket.
     * Generates a unique filename for the file and stores it with server-side encryption.
     *
     * @param {Express.Multer.File} file - The file object to be uploaded, typically received from Multer middleware.
     * @return {Promise<Object>} Returns a promise that resolves to an object containing the filename and the S3 URL of the uploaded file.
     */
    async uploadFileToS3(file: Express.Multer.File) {
        const filename = `${uuidv4()}-${file.originalname}`;
        const bucket = process.env.AWS_S3_BUCKET;

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: filename,
            Body: file.buffer,
            ContentType: file.mimetype,
            ServerSideEncryption: "aws:kms",
            // SSEKMSKeyId: process.env.AWS_S3_BUCKET_KMS_ID,
        });

        await s3Client.send(command);

        return {
            filename,
        };
    }


    async getFileFromS3(filename: string,expiresIn:number = 60 * 15) {
        const bucket = process.env.AWS_S3_BUCKET;
        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: filename,
        });
        return await getSignedUrl(s3Client, command, {expiresIn});
    }
}

