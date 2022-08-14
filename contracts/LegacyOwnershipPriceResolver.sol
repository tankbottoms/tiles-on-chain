// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

/*                                                                                        
       ...........................................................................        
       :++++++++++++++++++++++=::++++++++++++++++++++++=::++++++++++++++++++++++=:        
       :++++++++++++++++++++=.  :++++++++++++++++++++=.  :++++++++++++++++++++=:          
       :++++++++++++++++++=.    :++++++++++++++++++=:    :++++++++++++++++++=:            
       :++++++++++++++++=:      :++++++++++++++++=:      :+++++++===++++===:              
       :++++++++++++++=:        :++++++++++++++=:        :++++++==++++++=.                
       :++++++++++++=.          :++++++++++++=.          :+++++==+++++=.                  
       :++++++++++=.            :++++++++++=:            :+++++==+++=:                    
       :++++++++=:              :++++++++=:              :++++++===:                      
       :++++++=:                :++++++=:                :++++++=.                        
       :++++=:                  :++++=:                  :++++=:                          
       :++=.                    :++=.                    :++=:                            
       :=.                      :=:                      :=:                              
       :=======================-:=======================--=======================-        
       :+++++++++++++++++++++=: :+++++++++++++++++++++=: :+++++++++++++++++++++=:         
       :+++++++++++++++++++=.   :+++++++++++++++++++=.   :+++++++++++++++++++=:           
       :+++++++++++++++++=:     :+++++++++++++++++=:     :+++++++++++++++++=:             
       :+++++++++++++++=:       :+++++++++++++++=:       :+++++++++++++++=:               
       :+++++++++++++=:         :+++++++++++++=:         :+++++++++++++=:                 
       :+++++++++++=:           :+++++++++++=:           :+++++++++++=:                   
       :+++++++++=.             :+++++++++=:             :+++++++++=:                     
       :+++++++=:               :+++++++=:               :+++++++=:                       
       :+++++=:                 :+++++=:                 :+++++=:                         
       :+++=:                   :+++=:                   :+++=:                           
       :+=.                     :+=.                     :+=:                             
       :-.......................:-.......................--.......................        
       :++++++++++++++++++++++=::++++++++++++++++++++++=::++++++++++++++++++++++=.        
       :++++++++++++++++++++=:  :++++++++++++++++++++=:  :++++++++++++++++++++=:          
       :++++++++++++++++++=:    :++++++++++++++++++=:    :++++++++++++++++++=:            
       :+++++++===++++===:      :++++++++++++++++=:      :++++++++++++++++=.              
       :++++++==++++++=.        :++++++++++++++=:        :++++++++++++++=.                
       :+++++==+++++=:          :++++++++++++=:          :++++++++++++=:                  
       :+++++==+++=:            :++++++++++=:            :++++++++++=:                    
       :++++++===.              :++++++++=:              :++++++++=.                      
       :++++++=.                :++++++=:                :++++++=.                        
       :++++=:                  :++++=:                  :++++=.                          
       :++=:                    :++=:                    :++=:                            
       :=:                      :=:                      :=:                              
                                                                                          
                                                                                          
      Infinite Tiles v2.0.0                                                               
*/

import './interfaces/IOriginalTileNFT.sol';
import './SupplyPriceResolver.sol';

/**
  @notice A price resolver based on SupplyPriceResolver which first checks the original NFT ownership.
 */
contract LegacyOwnershipPriceResolver is SupplyPriceResolver {
  IOriginalTileNFT private immutable legacyContract;

  /**
    @notice Creates a resolver that allows 0-cost mints for current owners of the original NFTs in the contract at 0x64931F06d3266049Bf0195346973762E6996D764.
    @param _legacyContract Original NFT address.
    */
  constructor(
    IOriginalTileNFT _legacyContract,
    uint256 _basePrice,
    uint256 _multiplier,
    uint256 _tierSize,
    uint256 _priceCap,
    PriceFunction _priceFunction
  ) SupplyPriceResolver(_basePrice, _multiplier, _tierSize, _priceCap, _priceFunction) {
    legacyContract = _legacyContract;
  }

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
    @notice 
    @param account Caller account that would own the minted token.
    @param (uint256) Ignored token id.
    @param params Item at index 0 is expected to be an encoded uint256 representing current supply, followed by a 20-byte tile address.
    */
  function getPriceWithParams(
    address account,
    uint256,
    bytes calldata params
  ) public view virtual override returns (uint256 price) {
    address tileAddress = bytesToAddress(params, 32);
    uint256 originalTileId = legacyContract.idOfAddress(tileAddress);
    address originalOwner = legacyContract.ownerOf(originalTileId);

    if (account != originalOwner) {
      price = super.getPriceWithParams(account, 0, params);
    } else {
      price = 0;
    }
  }

  function bytesToAddress(bytes memory b, uint256 offset) private pure returns (address account) {
    bytes32 raw;

    for (uint256 i = 0; i < 20; i++) {
      raw |= bytes32(b[offset + i] & 0xFF) >> (i * 8);
    }

    account = address(uint160(uint256(raw >> 96)));
  }
}
