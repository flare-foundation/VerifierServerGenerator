# Designing attestation types

The purpose of an attestation type is to define the structure of the data that is brought on-chain and a relationship between request and response.

The definition is done in a Solidity interface.
A template is provided.
The name of the file should be `I<NameOfTheType>.sol` and the name of the interface in the file should be `I<NameOfTheType>`.
The following have to be specified:

- Sources, where the data is fetched from.
- RequestBody, how to specify the data to fetch.
- ResponseBody,the format of the relayed data.
- Potential custom substructs.
- Verification rules, how to fetch the data.

## Design guidelines

The response must be completely determined by the request.
If two independent verifiers try to construct the response to the same request, they should always get the same response.
The difference can only happen due to lack of one's access to the data needed to construct a response, but such cases should be avoided also.

Avoid yes/no responses if possible.
Lazy providers might just skip the process of getting the right response and just guess.
The response should indicate that work has been done.

Design the attestation types with gas consumption in mind.
Try to accommodate easy on-chain interaction with the responses.
