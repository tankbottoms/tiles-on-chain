// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

/**
  @notice Interface subset of original Tiles contract at 0x64931F06d3266049Bf0195346973762E6996D764.
 */
interface IOriginalTileNFT {
  function idOfAddress(address) external view returns (uint256);

  function ownerOf(uint256) external view returns (address);
}
