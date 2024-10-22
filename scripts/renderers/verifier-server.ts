import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

function GenerateService(name: string): string {
  const attType = name.replace('I', '');

  return `import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ${name}_Request,
  ${name}_Response,
} from 'generated/dto/${name}.dto';
import { IConfig } from 'src/config/configuration';
import {
  BaseVerifierService,
  IVerificationServiceConfig,
} from 'src/services/common/verifier-base.service';
import { AttestationResponse } from '../../src/dtos/generic/generic.dto';

@Injectable()
export class ${name}VerifierService extends BaseVerifierService<
  ${name}_Request,
  ${name}_Response
> {
    constructor(protected configService: ConfigService<IConfig>) {
    const config: IVerificationServiceConfig = {
      source: 'WEB2', //CONFIGURE THIS
      attestationName: "${attType}",
    };
    super(configService, config);
  }

  protected verifyRequest(
    fixedRequest: ${name}_Request,
  ): Promise<AttestationResponse<${name}_Response>> {
    throw 'implement this function';
  }
}
`;
}

function GenerateController(name: string): string {
  return `import { Controller } from '@nestjs/common';
    import { ApiTags } from '@nestjs/swagger';
    import {
      ${name}_Request,
       ${name}_Response,
    } from 'generated/dto/ ${name}.dto';
    import { BaseVerifierController } from 'src/controllers/base/verifier-base.controller';
    import { ${name}VerifierService } from './${name}.service';
    
    @ApiTags('${name}')
    @Controller('${name}')
    export class ${name}VerifierController extends BaseVerifierController<
       ${name}_Request,
       ${name}_Response
    > {
      constructor(protected readonly verifierService: ${name}VerifierService) {
        super();
      }
    }
`;
}

function GenerateModule(name: string): string {
  return `import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import configuration, { IConfig } from 'src/config/configuration';
import { ${name}VerifierController } from './${name}.controller';
import { ApiKeyStrategy } from 'src/auth/apikey.strategy';
import { AuthService } from 'src/auth/auth.service';
import { ${name}VerifierService } from './${name}.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    // add connection to a database
    // TypeOrmModule.forRootAsync({
    //   imports: [ConfigModule],
    //   useFactory: (config: ConfigService<IConfig>) =>
    //     config.get('typeOrmModuleOptions'),
    //   inject: [ConfigService],
    // }),
    AuthModule,
  ],
  controllers: [${name}VerifierController],
  providers: [ApiKeyStrategy, AuthService, ${name}VerifierService],
})
export class ${name}VerifierServerModule {}
`;
}

function GenerateServer(name: string): string {
  const tempString1 = '`${basePath}/api-doc`';
  const tempString2 = '`Server started listening at http://0.0.0.0:${PORT}`';
  const tempString3 =
    '`Websocket server started listening at ws://0.0.0.0:${PORT}`';

  return `import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { ${name}VerifierServerModule } from './${name}.module';

export async function run${name}VerifierServer() {
  const moduleClass = ${name}VerifierServerModule;
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
  SwaggerModule.setup(${tempString1}, app, document);

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3120;

  await app.listen(PORT, '0.0.0.0', () =>
    logger.log(${tempString2}),
  );

  logger.log(${tempString3});
}

`;
}

export function generateVerifierServer(name: string): void {
  const dirPath = join('server', name);

  mkdirSync(dirPath, { recursive: true });

  const service = GenerateService(name);
  const servicePath = join(dirPath, `${name}.service.ts`);
  writeFileSync(servicePath, service);

  const controller = GenerateController(name);
  const controllerPath = join(dirPath, `${name}.controller.ts`);

  writeFileSync(controllerPath, controller);

  const module = GenerateModule(name);
  const modulePath = join(dirPath, `${name}.module.ts`);

  writeFileSync(modulePath, module);

  const server = GenerateServer(name);
  const serverPath = join(dirPath, `${name}.server.ts`);

  writeFileSync(serverPath, server);
}
