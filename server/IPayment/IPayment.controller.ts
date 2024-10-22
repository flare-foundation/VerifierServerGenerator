import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  IPayment_Request,
  IPayment_Response,
} from 'generated/dto/IPayment.dto';
import { BaseVerifierController } from 'src/controllers/base/verifier-base.controller';
import { IPaymentVerifierService } from './IPayment.service';

@ApiTags('IPayment')
@Controller('IPayment')
export class IPaymentVerifierController extends BaseVerifierController<
  IPayment_Request,
  IPayment_Response
> {
  constructor(protected readonly verifierService: IPaymentVerifierService) {
    super();
  }
}
