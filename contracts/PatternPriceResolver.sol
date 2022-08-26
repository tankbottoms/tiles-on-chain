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
                                                                                          
                                                                                          
     Infinite Tiles v2 - a Juicebox project                                               
*/

import './interfaces/IPriceResolver.sol';

error UNSUPPORTED_OPERATION();

contract PatternPriceResolver is IPriceResolver {
  uint256 basePrice;
  uint256 multiplier;
  uint256 matchWidth;

  /**
   * @notice Pricing contract that prices tiles based on repeating hex characters.
   *
   * @param _basePrice Base NFT price
   * @param _multiplier Pair price multiplier.
   * @param _matchWidth Width to match against, expected to be a multiple of 4, like 16, 8, 4.
   */
  constructor(
    uint256 _basePrice,
    uint256 _multiplier,
    uint256 _matchWidth
  ) {
    basePrice = _basePrice;
    multiplier = _multiplier;
    matchWidth = _matchWidth;
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
    @param (address) New owner address is ignored
    @param (uint256) Next token id is ignored.
    @param _params Item at index 0 is expected to be an encoded uint256 representing current supply, followed by a 20-byte tile address.
    */
  function getPriceWithParams(
    address,
    uint256,
    bytes calldata _params
  ) public view virtual override returns (uint256 price) {
    uint160 tileAddress = uint160(bytesToAddress(_params, 32));

    /**
     * @dev 36 is the max number of 4-bit sections we can have in the 144bit stretch representing the image portions.
     */

    uint8 sectionIncrement = uint8(matchWidth / 4);

    uint16[36] memory sections;
    for (uint8 i; i != 36; ) {
      uint16 shift = uint16(160 - 16 - matchWidth * (1 + i / sectionIncrement));
      sections[i] = uint16((tileAddress >> shift) & (2**matchWidth - 1));
      i += sectionIncrement;
    }

    uint8[36] memory matches;
    bool[36] memory matched;
    for (uint8 i; i != 36; ) {
      if (matched[i]) {
        i += sectionIncrement;
        continue;
      }

      for (uint8 j; j != 36; ) {
        if (i == j || matched[j]) {
          j += sectionIncrement;
          continue;
        }

        if (sections[i] == sections[j]) {
          matched[j] = true;
          ++matches[i];
        }

        j += sectionIncrement;
      }
      i += sectionIncrement;
    }

    uint8 matchCount;
    for (uint8 i; i != 36; ) {
      matchCount += matches[i];
      i += sectionIncrement;
    }

    price = basePrice + matchCount * multiplier;
  }

  function bytesToAddress(bytes memory b, uint256 offset) private pure returns (address account) {
    bytes32 raw;

    for (uint256 i = 0; i != 20; ) {
      raw |= bytes32(b[offset + i] & 0xFF) >> (i * 8);
      ++i;
    }

    account = address(uint160(uint256(raw >> 96)));
  }
}
