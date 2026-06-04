import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Socket } from 'socket.io';

export async function handleSocketWithValidation<T extends object>(
  client: Socket,
  event: string,
  dtoClass: new (...args: any[]) => T,
  data: any,
  handler: (dto: T, client: Socket) => Promise<any>
) {
  console.log(dtoClass)
  console.log(data)
  const dto = plainToInstance(dtoClass, data);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
    console.log(errors)
  if (errors.length > 0) {
    client.emit(event, {
      success: false,
      error: errors.map(e => ({
        property: e.property,
        constraints: e.constraints ? Object.values(e.constraints)[0] : undefined,
      })),
    });
    return;
  }
  try {
    const result = await handler(dto, client);
    client.emit(event, {
      success: true,
      data: result,
    });
  } catch (err) {
      // console.log("[SOCKET ERROR] ",err)
    client.emit(event, {
      success: false,
        data:{},
      error: err.message || 'Internal error',
        errorType: err.cause || 'Unknown',
    });
  }
}
