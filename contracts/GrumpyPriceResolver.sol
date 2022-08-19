// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import './interfaces/IPriceResolver.sol';

/**
  @notice A price resolver that always fails.
 */
contract GrumpyPriceResolver is IPriceResolver {
  error UNSUPPORTED_OPERATION();

  constructor() {}

  /**
    @notice Unsupported operation.
    */
  function getPrice() public view virtual override returns (uint256) {
    revert UNSUPPORTED_OPERATION();
  }

  /**
    @notice Unsupported operation.
    */
  function getPriceFor(address) public view virtual override returns (uint256) {
    revert UNSUPPORTED_OPERATION();
  }

  /**
    @notice Unsupported operation.
    */
  function getPriceOf(uint256) public view virtual override returns (uint256) {
    revert UNSUPPORTED_OPERATION();
  }

  /**
    @notice Unsupported operation.
    */
  function getPriceWithParams(
    address,
    uint256,
    bytes calldata
  ) public view virtual override returns (uint256) {
    revert UNSUPPORTED_OPERATION();
  }
}
