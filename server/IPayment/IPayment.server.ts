import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { IPaymentVerifierServerModule } from './IPayment.module';

export async function runIPaymentVerifierServer() {
  const moduleClass = IPaymentVerifierServerModule;
  const app = await NestFactory.create(moduleClass);

  const logger = new Logger();

  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors();

  const basePath = process.env.APP_BASE_PATH ?? '';

  app.setGlobalPrefix(basePath);
  const config = new DocumentBuilder()
    .setTitle('Verifier server')
    .setBasePath(basePath)
    .setDescription('Verifier')
    .addApiKey({ type: 'apiKey', name: 'X-API-KEY', in: 'header' }, 'X-API-KEY')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${basePath}/api-doc`, app, document);

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3120;

  await app.listen(PORT, '0.0.0.0', () =>
    logger.log(`Server started listening at http://0.0.0.0:${PORT}`),
  );

  logger.log(`Websocket server started listening at ws://0.0.0.0:${PORT}`);
}
