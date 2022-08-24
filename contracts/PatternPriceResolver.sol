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

    /**
     * @notice blah
     * 
     * @param _basePrice blah
     * @param _multiplier blah
     */
  constructor(
    uint256 _basePrice,
    uint256 _multiplier
  ) {
    basePrice = _basePrice;
    multiplier = _multiplier;
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

    uint16[9] memory sections;
    for (uint8 i; i != 9;) {
        sections[i] = uint16(tileAddress >> ((8 - i) * 16));
        ++i;
    }

    uint8[9] memory matches;
    bool[9] memory matched;
    for (uint8 i; i != 9;) {
        if (matched[i]) {
            ++i;
            continue;
        }

        for (uint8 j; j != 9;) {
            if (i == j || matched[j]) {
                ++j;
                continue;
            }

            if (sections[i] == sections[j]) {
                matched[j] = true;
                ++matches[i];
            }

            ++j;
        }
        ++i;
    }

    uint8 matchCount;
    for (uint8 i; i != 9;) {
        matchCount += matches[i];
        ++i;
    }

    price = basePrice + matchCount * multiplier;
  }

  function bytesToAddress(bytes memory b, uint256 offset) private pure returns (address account) {
    bytes32 raw;

    for (uint256 i = 0; i < 20; i++) {
      raw |= bytes32(b[offset + i] & 0xFF) >> (i * 8);
    }

    account = address(uint160(uint256(raw >> 96)));
  }
}
