// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import '../../../configs/contracts/IAddressValidity.sol';

interface IAddressValidityVerification {
    function verifyAddressValidity(
        IAddressValidity.Proof calldata _proof
    ) external view returns (bool _proved);
}
