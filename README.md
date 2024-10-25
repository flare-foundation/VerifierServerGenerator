<p align="center">
  <a href="https://flare.network/" target="blank"><img src="https://flare.network/wp-content/uploads/Artboard-1-1.svg" width="400" height="300" alt="Flare Logo" /></a>
</p>

# Verifier Server Generator

This repo contains a tool for creation of a verifier server using [NestJS](https://nestjs.com/) from an attestation type definition file.

# Getting started

We use [Yarn](https://yarnpkg.com/) for package management.
First run

```bash
yarn
```

to get all the needed packages.

## Definition file

A template file [TypeTemplate.sol.example](ITypeTemplate.sol.example) is provided.
Create a copy and define your type.
The name of the file must be `I<NameOfTheType>.sol` and the name of the interface in the file must be `I<NameOfTheType>`.
At `@custom:name` add the NameOfTheType.
Use at most 32 ascii characters, preferably latin letters in pascal case. At `@custom:supported` add the indicator from where the data is sourced. The existing are `BTC,DOGE,XRP,FLR,SGB,ETH`, use `WEB2` to indicate data from web2. One type can support more data sources.
Add a short description of the type at `@notice` and a brief verification rule (how to construct response from the request) ar `@custom:verification`.
Do not bother with `@custom:lut` for now.

The structs that need to be defined are `RequestBody` and `ResponseBody`.
All fields should be commented with `@param fieldName` as in the template.
Substructs can be also be used as indicated in the template.

Place the file inside `contracts/interfaces/types`

## Generation

Use

```bash
yarn generate server
```

to generate verifier server templates for each type defined in `contracts/interfaces/types`.
The command will overwrite any existing files that were generated for the types.

Additionally, a mock verification contract will be generated.

Pass additional parameter

```bash
yarn generate server -t I<NameOfTheType>
```

to generate server template for just the type defined in `I<NameOfTheType>.sol`.

### What has to be configured

The server files for `<NameOfTheType>` are generated in `server/I<NameOfTheType>`.

IMPORTANT: Any manual changes to files in `server/I<NameOfTheType>` are overwritten if you call
`yarn generate server` or `yarn generate server -t I<NameOfTheType>`!

#### One source

The generated files are ready to work with if you plan to use only one source.

All that has to be configured is in the file `I<NameOfTheType>.service.ts`.
Change the source in the constructor to the one specified in type definition.

The main is `verifyRequest` function.
Implement it in such a way that it matches verification rules defined by attestation type
(you can also finish the function and then write the rules to match the function).

#### Multiple sources

Each source needs its own service and controllers.

In `I<NameOfTheType>.service.ts` for each source, create a new class (copy the generated one and rename it), for example
`<SourceID>I<NameOFTheType>VerifierService`, that implements `verifyRequest` function for the source.

In `I<NameOfTheType>.controller.ts` for each source, create a new class (copy the generated one and rename it), for example
`<SourceID>I<NameOFTheType>VerifierController`, set the type of verifierService to the one you created for this type,
change
`@ApiTags('I<NameOFTheType>')` to `@ApiTags('I<NameOFTheType>', '<sourceID>')` and
`@Controller('I<NameOFTheType>')` to `@Controller('<sourceID>/I<NameOFTheType>')`.

In `I<NameOfTheType>.module.ts`, add all new services and controllers to the respective arrays.

## Docker

Familiarize yourself with [Docker](https://www.docker.com/).

For each attestation type, we generate a Dockerfile inside `server/I<NameOfTheType>` folder that prepares the server to be run inside a Docker container.
You might need to update Dockerfile to accommodate the code you added.

Run

```zsh
yarn build
```

To build an image for I<NameOfTheType> run

```zsh
docker build -t library/verifier-indexer-api-<NameOfTheType> -f server/I<NameOfTheType>/Dockerfile .
```

To start the server run and expose the server on <PORT> run.

```zsh
docker run --rm --publish <PORT>:8000  library/verifier-indexer-api-<NameOfTheType>
```

## Verification contract

We generate a mock verification contract (and its interface) in solidity with a method `verify<NameOfTheType>` that accepts attestation response with Merkle proof (see struct Proof in `I<NameOfTheType>.sol`) and always confirms it.
(A verification contract in a real setup would check the response with proof against the Merkle root stored on the Relay contract.)
