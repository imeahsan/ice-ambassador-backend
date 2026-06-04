import {
    Controller,
    FileTypeValidator,
    Get,
    MaxFileSizeValidator,
    Param,
    ParseFilePipe,
    Post,
    Req,
    Res,
    UploadedFile,
    UseInterceptors
} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import {FilesService} from './files.service';
import {Request, Response} from 'express';

@Controller('files')
export class FilesController {
    constructor(private readonly filesService: FilesService) {}


    @Post('upload')
    //add validation for file type and size

    @UseInterceptors(FileInterceptor('file',))
    async uploadFile(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
                    new FileTypeValidator({ fileType: /(jpeg|png|jpg|)$/ }),
                ],
            }),
        )
        @UploadedFile() file: Express.Multer.File,
        @Req() req: Request,
    ) {
        return await this.filesService.uploadFileToS3(file);
    }

    @Get(':filename')
    async getFile(@Param('filename') filename: string,         @Res() res: Response,
    ) {
        let url= await this.filesService.getFileFromS3(filename)
       return res.redirect(url)

    }

}
