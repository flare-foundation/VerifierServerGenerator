# Smart contract using FDC

Flare Data Connector allow smart contracts to trust the data that was provided by the user.
The contract should specify the following things:

- which attestation types and sources it integrates
- what data it uses (what should be in request/response) to trigger an action.

## FDC life cycle

A user post a request to the FDC hub.
A small fee is paid for the request.
The request is listened to by the data providers that process the request.
If enough providers successfully verify (build the response) the request, the hash of the response is included in the Merkle tree and its Merkle root is published on the Relay contract.
A user queries a trusted data provider for the response and Merkle proof of inclusion of Merkle tree.
A user posts the response with proof to the chosen smart contract.
Smart contract uses Merkle proof to check that the response was indeed included in the Merkle tree. The check is done through a verification contract.
If the check succeeds, smart contract uses the data in the request and response (the request is included in the response).

### Mocking the process

On the hackaton, you can skip the process with data providers and use a mock verification contract that is confirms all responses and just focus on the contract that uses the response.
However, such skip should never be used in actual production.
