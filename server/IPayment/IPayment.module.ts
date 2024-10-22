import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import configuration, { IConfig } from 'src/config/configuration';
import { IPaymentVerifierController } from './IPayment.controller';
import { ApiKeyStrategy } from 'src/auth/apikey.strategy';
import { AuthService } from 'src/auth/auth.service';
import { IPaymentVerifierService } from './IPayment.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService<IConfig>) =>
        config.get('typeOrmModuleOptions'),
      inject: [ConfigService],
    }),
    AuthModule,
  ],
  controllers: [IPaymentVerifierController],
  providers: [ApiKeyStrategy, AuthService, IPaymentVerifierService],
})
export class IPaymentVerifierServerModule {}
