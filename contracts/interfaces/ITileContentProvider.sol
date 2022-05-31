// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import './ITileNFT.sol';
import './ITokenUriResolver.sol';

interface ITileContentProvider is ITokenUriResolver {
  function setParent(ITileNFT) external;

  function getSvgContent(address) external view returns (string memory);
}
