// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import '@jbx-protocol/contracts-v2/contracts/interfaces/IJBDirectory.sol';
import '@jbx-protocol/contracts-v2/contracts/interfaces/IJBFundingCycleDataSource.sol';
import '@jbx-protocol/contracts-v2/contracts/interfaces/IJBPayDelegate.sol';
import '@jbx-protocol/contracts-v2/contracts/interfaces/IJBRedemptionDelegate.sol';
import '@jbx-protocol/contracts-v2/contracts/structs/JBDidPayData.sol';
import '@jbx-protocol/contracts-v2/contracts/structs/JBDidRedeemData.sol';
import '@jbx-protocol/contracts-v2/contracts/structs/JBRedeemParamsData.sol';
import '@jbx-protocol/contracts-v2/contracts/structs/JBTokenAmount.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

import './interfaces/IInfiniteTiles.sol';

/**
 * @title Juicebox data source delegate that mints Infinte Tile NFTs to direct project contributors.
 *
 * @notice This contract allows project creators to reward contributors with NFTs. Intended use is to incentivize initial project support by minting a limited number of NFTs to the first N contributors.
 *
 * @notice One use case is enabling the project to mint an NFT for anyone contributing any amount without a mint limit. Set minContribution.value to 0 and maxSupply to uint256.max to do this. To mint NFTs to the first 100 participants contributing 1000 DAI or more, set minContribution.value to 1000000000000000000000 (3 + 18 zeros), minContribution.token to 0x6B175474E89094C44Da98b954EedeAC495271d0F and maxSupply to 100.
 *
 * @dev Keep in mind that this PayDelegate and RedeemDelegate implementation will simply pass through the weight and reclaimAmount it is called with.
 */
contract InfiniteTilesDataSourceDelegate is Ownable, IJBFundingCycleDataSource, IJBPayDelegate, IJBRedemptionDelegate {
  //*********************************************************************//
  // --------------------------- custom errors ------------------------- //
  //*********************************************************************//
  error INVALID_PAYMENT_EVENT();
  error INCORRECT_OWNER();
  error INVALID_ADDRESS();
  error INVALID_TOKEN();
  error INVALID_REQUEST(string);

  //*********************************************************************//
  // -------------------------- constructor ---------------------------- //
  //*********************************************************************//

  /**
   * @notice Project id of the project this configuration is associated with.
   */
  uint256 private jbxProjectId;

  /**
   * @notice Juicebox directory
   */
  IJBDirectory private jbxDirectory;

  /**
   * @notice Minimum contribution amount to trigger NFT distribution, denominated in some currency defined as part of this object.
   *
   *   @dev Only one NFT will be minted for any amount at or above this value.
   */
  JBTokenAmount private minContribution;

  IInfiniteTiles private infiniteTiles;

  /**
   * @param _jbxProjectId JBX project id this reward is associated with.
   * @param _jbxDirectory JBX directory.
   * @param _minContribution Minimum contribution amount to be eligible for this reward.
   * @param _admin Set an alternate owner.
   * @param _infiniteTiles Infinite Tiles NFT contract.
   */
  constructor(
    uint256 _jbxProjectId,
    IJBDirectory _jbxDirectory,
    JBTokenAmount memory _minContribution,
    address _admin,
    IInfiniteTiles _infiniteTiles
  ) {
    jbxProjectId = _jbxProjectId;
    jbxDirectory = _jbxDirectory;
    minContribution = _minContribution;
    infiniteTiles = _infiniteTiles;

    if (_admin != address(0)) {
      _transferOwnership(_admin);
    }
  }

  //*********************************************************************//
  // ------------------- IJBFundingCycleDataSource --------------------- //
  //*********************************************************************//

  function payParams(JBPayParamsData calldata _data)
    external
    view
    override
    returns (
      uint256 weight,
      string memory memo,
      IJBPayDelegate delegate
    )
  {
    return (_data.weight, _data.memo, IJBPayDelegate(address(this)));
  }

  function redeemParams(JBRedeemParamsData calldata _data)
    external
    pure
    override
    returns (
      uint256 reclaimAmount,
      string memory memo,
      IJBRedemptionDelegate delegate
    )
  {
    return (_data.reclaimAmount.value, _data.memo, IJBRedemptionDelegate(address(0)));
  }

  //*********************************************************************//
  // ------------------------ IJBPayDelegate --------------------------- //
  //*********************************************************************//

  /**
   * @notice Part of IJBPayDelegate, this function will mint an NFT to the contributor (_data.beneficiary) if conditions are met.
   *
   * @dev This function will revert if the terminal calling it does not belong to the registered project id.
   *
   * @dev This function will try, but not fail, to mint a tile to the beneficiary. The process will only commence if the minimum contribution was made and the tile is not alredy owned.
   *
   * @param _data Juicebox project contribution data.
   */
  function didPay(JBDidPayData calldata _data) external override {
    if (!jbxDirectory.isTerminalOf(jbxProjectId, IJBPaymentTerminal(msg.sender)) || _data.projectId != jbxProjectId) {
      revert INVALID_PAYMENT_EVENT();
    }

    if ((_data.amount.value >= minContribution.value && _data.amount.token == minContribution.token) || minContribution.value == 0) {
      if (infiniteTiles.idForAddress(_data.beneficiary) == 0) {
        infiniteTiles.superMint(_data.beneficiary, _data.beneficiary);
      }
    }
  }

  //*********************************************************************//
  // -------------------- IJBRedemptionDelegate ------------------------ //
  //*********************************************************************//

  /**
   * @notice NFT redemption is not supported.
   */
  // solhint-disable-next-line
  function didRedeem(JBDidRedeemData calldata _data) external override {
    // not a supported workflow for NFTs
  }

  //*********************************************************************//
  // ---------------------------- IERC165 ------------------------------ //
  //*********************************************************************//

  function supportsInterface(bytes4 _interfaceId) public pure override returns (bool) {
    return
      _interfaceId == type(IJBFundingCycleDataSource).interfaceId ||
      _interfaceId == type(IJBPayDelegate).interfaceId ||
      _interfaceId == type(IJBRedemptionDelegate).interfaceId;
  }
}
