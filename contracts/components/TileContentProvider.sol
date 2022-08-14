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

import '@openzeppelin/contracts/utils/Strings.sol';

import './AbstractTileNFTContent.sol';
import './Base64.sol';
import './StringHelpers.sol';
import '../interfaces/ITileContentProvider.sol';
import '../interfaces/ITileNFT.sol';
import './Ring.sol';

/**
  @notice 
 */
contract TileContentProvider is AbstractTileNFTContent, ITileContentProvider {
  error ALREADY_ASSOCIATED();

  string private red = '#FE4465';
  string private black = '#222';
  string private blue = '#1A49EF';
  string private yellow = '#F8D938';

  string[][] private sectorColorVariants = [
    [red, yellow, black],
    [red, black, blue],
    [red, yellow, blue],
    [red, blue, yellow],
    [blue, yellow, red],
    [blue, red, yellow],
    [blue, yellow, yellow],
    [blue, black, red],
    [black, red, yellow],
    [black, red, blue],
    [black, blue, red],
    [black, yellow, blue],
    [yellow, red, black],
    [yellow, blue, red],
    [yellow, black, blue],
    [yellow, black, red]
  ];

  ITileNFT private parent;

  constructor() {}

  function setParent(ITileNFT _parent) public override {
    if (address(parent) != address(0)) {
      revert ALREADY_ASSOCIATED();
    }

    parent = _parent;
  }

  function tokenUri(uint256 _tokenId) external view override returns (string memory uri) {
    uri = getSvgContent(parent.addressForId(_tokenId));
  }

  function getSvgContent(address addr) public view override returns (string memory) {
    string memory str = head;
    uint16[4][10] memory addressSegments;
    uint16[] memory chars = bytesToChars(addr);

    for (uint16 i = 0; i < 10; i++) {
      addressSegments[i][0] = chars[i * 4 + 0];
      addressSegments[i][1] = chars[i * 4 + 1];
      addressSegments[i][2] = chars[i * 4 + 2];
      addressSegments[i][3] = chars[i * 4 + 3];
    }

    Ring[] memory rings = new Ring[](2);

    uint160[2] memory indexes = [
      (uint160(addr) / (16**38)) % 16**2,
      (uint160(addr) / (16**36)) % 16**2
    ];

    uint8 ringsCount = 0;

    for (uint256 i = 0; i < 2; i++) {
      if (indexes[i] == 0) continue;
      uint160 ringIndex = indexes[i] > 0 ? indexes[i] - 1 : indexes[i];
      rings[ringsCount].positionIndex = positionIndex[ringIndex];
      rings[ringsCount].size = size[ringIndex];
      rings[ringsCount].layer = layer[ringIndex];
      rings[ringsCount].positionKind = positionKind[ringIndex];
      rings[ringsCount].solid = solid[ringIndex];
      ringsCount += 1;
    }

    for (uint8 r = 0; r < 3; r++) {
      for (uint8 i = 0; i < 9; i++) {
        (string memory svg, string memory color) = generateTileSectors(addressSegments, i, r);
        if (StringHelpers.stringStartsWith(svg, '<path')) {
          str = string(
            abi.encodePacked(
              str,
              '<g transform="matrix(1,0,0,1,',
              Strings.toString((i % 3) * 100),
              ',',
              Strings.toString(((i % 9) / 3) * 100),
              ')">',
              StringHelpers.replace(
                StringHelpers.replace(svg, '#000', color),
                '/>',
                ' style="opacity: 0.88;" />'
              ),
              '</g>'
            )
          );
        } else if (StringHelpers.stringStartsWith(svg, '<circle')) {
          str = string(
            abi.encodePacked(
              str,
              '<g transform="matrix(1,0,0,1,',
              Strings.toString((i % 3) * 100),
              ',',
              Strings.toString(((i % 9) / 3) * 100),
              ')">',
              StringHelpers.replace(
                StringHelpers.replace(svg, '#000', color),
                '/>',
                ' style="opacity: 0.88;" />'
              ),
              '</g>'
            )
          );
        }
      }

      for (uint8 i = 0; i < ringsCount; i++) {
        Ring memory ring = rings[i];
        if (ring.layer != r) {
          continue;
        }

        uint32 posX;
        uint32 posY;
        uint32 diameter10x;

        if (ring.size == 0) {
          diameter10x = 100;
        } else if (ring.size == 1) {
          diameter10x = 488;
        } else if (ring.size == 2) {
          diameter10x = 900;
        } else if (ring.size == 3) {
          diameter10x = 1900;
        }
        if (2 == ring.layer) {
          diameter10x += 5;
        }
        uint32 posI = uint32(ring.positionIndex);
        if (!ring.positionKind) {
          posX = (posI % 4) * 100;
          posY = posI > 11 ? 300 : posI > 7 ? 200 : posI > 3 ? 100 : 0;
        } else if (ring.positionKind) {
          posX = 100 * (posI % 3) + 50;
          posY = (posI > 5 ? 2 * 100 : posI > 2 ? 100 : 0) + 50;
        }
        str = string(
          abi.encodePacked(
            str,
            '<g transform="matrix(1,0,0,1,',
            Strings.toString(posX),
            ',',
            Strings.toString(posY),
            ')"><circle r="',
            StringHelpers.divide(diameter10x, 20, 5),
            '" fill="',
            ring.solid ? canvasColor : 'none',
            '" stroke-width="10" stroke="',
            canvasColor,
            '" /></g>'
          )
        );
      }
    }

    str = string(abi.encodePacked(str, foot));
    string memory json = Base64.encode(
      bytes(
        string(
          abi.encodePacked(
            '{"name": "Tiles #',
            Strings.toString(uint256(uint160(addr))),
            '","attributes": [ { "trait_type": "Color", "value": "',
            'colorName',
            '" }, { "trait_type": "Unique Tiles", "value": ',
            '0',
            ' }, { "trait_type": "Rings", "value": ',
            '0',
            ' }, { "trait_type": "Frequency Multiple", "value": ',
            Strings.toString(0),
            ' }]',
            ', "description": "description goes here", "image": "data:image/svg+xml;base64,',
            Base64.encode(bytes(string(abi.encodePacked(str)))),
            '"}'
          )
        )
      )
    );
    string memory output = string(abi.encodePacked('data:application/json;base64,', json));

    return output;
  }

  function bytesToChars(address _address) private pure returns (uint16[] memory) {
    uint16[] memory chars = new uint16[](40);
    uint160 temp = uint160(_address);
    uint32 i = 0;
    while (temp > 0) {
      uint16 right_most_digit = uint16(temp % 16);
      temp -= right_most_digit;
      temp /= 16;
      chars[39 - i] = right_most_digit;
      i++;
    }
    return chars;
  }

  function sectorColorsFromInt16(uint16 char, uint8 r) private view returns (string memory) {
    string[] memory colors = sectorColorVariants[char];
    return colors[r];
  }

  function generateTileSectors(
    uint16[4][10] memory chars,
    uint8 i,
    uint8 r
  ) private view returns (string memory, string memory) {
    string memory color = sectorColorsFromInt16(chars[i + 1][0], r);
    return (svgs[chars[i + 1][r + 1]], color);
  }
}
