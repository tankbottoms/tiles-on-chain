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

import './interfaces/IPriceResolver.sol';

/**
  @notice A price resolver that derives the price of the token being minted based on total number of tokens already minted.
 */
contract SupplyPriceResolver is IPriceResolver {
  error UNSUPPORTED_OPERATION();

  enum PriceFunction {
    LINEAR,
    EXP
  }

  uint256 private immutable basePrice;
  uint256 private immutable multiplier;
  uint256 private immutable tierSize;
  uint256 private immutable priceCap;
  PriceFunction private immutable priceFunction;

  /**
    @notice Creates a resolver that calculates a tiered price based on current token supply. Price will be either multipied by multiplier * (currentSupply % tierSize) or multiplier ** (currentSupply % tierSize).
    @param _basePrice Minimum price to return.
    @param _multiplier Price multiplyer.
    @param _tierSize Price tier size.
    @param _priceCap Maximum price to return
    @param _priceFunction Price multiplier application, linear or exponential.
    */
  constructor(
    uint256 _basePrice,
    uint256 _multiplier,
    uint256 _tierSize,
    uint256 _priceCap,
    PriceFunction _priceFunction
  ) {
    basePrice = _basePrice;
    multiplier = _multiplier;
    tierSize = _tierSize;
    priceCap = _priceCap;
    priceFunction = _priceFunction;
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
    @notice Returns the items price based on current supply.
    @param (address) Ignored address.
    @param (uint256) Ignored token id.
    @param params Item at index 0 is expected to be an encoded uint256 representing current supply.
    */
  function getPriceWithParams(
    address,
    uint256,
    bytes calldata params
  ) public view virtual override returns (uint256 price) {
    uint256 currentSupply = bytesToUint(params);

    if (priceFunction == PriceFunction.LINEAR) {
      price = multiplier * (currentSupply / tierSize) * basePrice;
    } else {
      // PriceFunction.EXP
      price = multiplier**(currentSupply / tierSize) * basePrice;
    }

    if (price > priceCap) {
      price = priceCap;
    }

    if (price == 0) {
      price = basePrice;
    }
  }

  function bytesToUint(bytes memory b) private pure returns (uint256 number) {
    for (uint256 i = 0; i < 32; i++) {
      number = number + uint256(uint8(b[i])) * (2**(8 * (32 - (i + 1))));
    }
  }
}
