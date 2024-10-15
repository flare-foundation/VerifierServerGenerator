// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import '../../../configs/contracts/IAddressValidity.sol';
import '../interface/IAddressValidityVerification.sol';
import {MerkleProof} from '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';

/**
 * Contract mocking verifying AddressValidity attestations.
 */
contract AddressValidityVerification is IAddressValidityVerification {
    /**
     * @inheritdoc IAddressValidityVerification
     */
    function verifyAddressValidity(
        IAddressValidity.Proof calldata _proof
    ) external view returns (bool _proved) {
        return _proof.data.attestationType == bytes32('AddressValidity');
    }
}
