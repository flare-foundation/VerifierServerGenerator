import { ChainType, ZERO_BYTES_32 } from '@flarenetwork/mcc';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AttestationTypeOptions,
  IConfig,
  SourceNames,
} from '../../config/configuration';

import { AttestationDefinitionStore } from '../../../external-libs/AttestationDefinitionStore';
import { ARBase, ARESBase } from '../../../external-libs/interfaces';
import { MIC_SALT, encodeAttestationName } from '../../../external-libs/utils';
import {
  AttestationResponse,
  AttestationResponseEncoded,
  AttestationResponseStatus,
  EncodedRequestResponse,
  MicResponse,
} from '../../dtos/generic/generic.dto';

export interface IVerificationServiceConfig {
  source: SourceNames;
  attestationName: string;
}

export abstract class BaseVerifierService<
  Req extends ARBase,
  Res extends ARESBase,
> {
  store: AttestationDefinitionStore;

  source: SourceNames;
  attestationName: string;
  isTestnet: boolean;

  constructor(
    protected configService: ConfigService<IConfig>,
    config: IVerificationServiceConfig,
  ) {
    this.store = new AttestationDefinitionStore('./generated/config');
    this.source = config.source;
    this.attestationName = config.attestationName;
    this.isTestnet = this.configService.getOrThrow<boolean>('isTestnet');
  }

  protected abstract verifyRequest(
    fixedRequest: Req,
  ): Promise<AttestationResponse<Res>>;

  private async verifyRequestInternal(
    request: Req,
  ): Promise<AttestationResponse<Res>> {
    if (
      request.attestationType !== encodeAttestationName(this.attestationName) ||
      request.sourceId !==
        encodeAttestationName((this.isTestnet ? 'test' : '') + this.source)
    ) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: `Attestation type and source id combination not supported: (${
            request.attestationType
          }, ${request.sourceId}). This source supports attestation type '${
            this.attestationName
          }' (${encodeAttestationName(this.attestationName)}) and source id '${
            (this.isTestnet ? 'test' : '') + this.source
          }' (${encodeAttestationName(
            (this.isTestnet ? 'test' : '') + this.source,
          )}).`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const fixedRequest = {
      messageIntegrityCode: ZERO_BYTES_32,
      ...request, // if messageIntegrityCode is provided, it will be shadowed
    };

    return this.verifyRequest(fixedRequest);
  }

  public async verifyEncodedRequest(
    abiEncodedRequest: string,
  ): Promise<AttestationResponse<Res>> {
    const requestJSON = this.store.parseRequest<Req>(abiEncodedRequest);
    const response = await this.verifyRequestInternal(requestJSON);
    return response;
  }

  public async verifyEncodedRequestFDC(
    abiEncodedRequest: string,
  ): Promise<AttestationResponseEncoded> {
    const requestJSON = this.store.parseRequest<Req>(abiEncodedRequest);
    const response = await this.verifyRequestInternal(requestJSON);
    if (
      response.status !== AttestationResponseStatus.VALID ||
      !response.response
    ) {
      return {
        status: response.status,
      };
    }
    const encoded = this.store.encodeResponse(response.response);
    return {
      status: response.status,
      abiEncodedResponse: encoded,
    };
  }

  public async prepareResponse(
    request: Req,
  ): Promise<AttestationResponse<Res>> {
    const response = await this.verifyRequestInternal(request);
    return response;
  }

  public async mic(request: Req): Promise<MicResponse> {
    const result = await this.verifyRequestInternal(request);
    if (result.status !== AttestationResponseStatus.VALID) {
      return new MicResponse({ status: result.status });
    }
    const response = result.response;
    if (!response) return new MicResponse({ status: result.status });
    return new MicResponse({
      status: AttestationResponseStatus.VALID,
      messageIntegrityCode: this.store.attestationResponseHash<Res>(
        response,
        MIC_SALT,
      ),
    });
  }

  public async prepareRequest(request: Req): Promise<EncodedRequestResponse> {
    const result = await this.verifyRequestInternal(request);
    if (result.status !== AttestationResponseStatus.VALID) {
      return new EncodedRequestResponse({ status: result.status });
    }
    const response = result.response;

    if (!response) return new EncodedRequestResponse({ status: result.status });
    const newRequest = {
      ...request,
      messageIntegrityCode: this.store.attestationResponseHash<Res>(
        response,
        MIC_SALT,
      )!,
    } as Req;

    return new EncodedRequestResponse({
      status: AttestationResponseStatus.VALID,
      abiEncodedRequest: this.store.encodeRequest(newRequest),
    });
  }
}

export function fromNoMic<T extends Omit<ARBase, 'messageIntegrityCode'>>(
  request: T,
) {
  const fixedRequest = {
    messageIntegrityCode: ZERO_BYTES_32,
    ...request, // if messageIntegrityCode is provided, it will be shadowed
  };
  return fixedRequest;
}

function getSourceName(source: ChainType): SourceNames {
  switch (source) {
    case ChainType.DOGE:
      return 'DOGE';
    case ChainType.BTC:
      return 'BTC';
    case ChainType.XRP:
      return 'XRP';
    default:
      throw new Error(`Unsupported source chain, ${source}`);
  }
}
