import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IPayment_Request,
  IPayment_Response,
} from 'generated/dto/IPayment.dto';
import { IConfig } from 'src/config/configuration';
import {
  BaseVerifierService,
  IVerificationServiceConfig,
} from 'src/services/common/verifier-base.service';
import { AttestationResponse } from '../../src/dtos/generic/generic.dto';

@Injectable()
export class IPaymentVerifierService extends BaseVerifierService<
  IPayment_Request,
  IPayment_Response
> {
  constructor(
    protected configService: ConfigService<IConfig>,
    config: IVerificationServiceConfig,
  ) {
    super(configService, config);
  }

  protected verifyRequest(
    fixedRequest: IPayment_Request,
  ): Promise<AttestationResponse<IPayment_Response>> {
    throw 'implement this function';
  }
}
