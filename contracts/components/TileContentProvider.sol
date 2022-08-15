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

import '../interfaces/ITileContentProvider.sol';
import '../interfaces/ITileNFT.sol';
import './AbstractTileNFTContent.sol';
import './Base64.sol';
import './Ring.sol';
import './StringHelpers.sol';

/**
  @notice 
 */
contract TileContentProvider is AbstractTileNFTContent, ITileContentProvider {
  error ALREADY_ASSOCIATED();

  string private red = '#FE4465';
  string private black = '#222';
  string private blue = '#1A49EF';
  string private yellow = '#F8D938';
  string private description =
    'Humans are characterized by a desire to form communities around ideas, symbols, and artifacts that satisfy our overlapping interpretations of beauty. Tiles are a celebration of what gives meaning to those communities: the individual.  There is one Tile generated for every possible ETH wallet address, each representing a unique identity in the decentralized ecosystem that makes projects like this possible.  Mathematically, all Tiles are equally rare. They are all fashioned from the same assortment of simple shapes and colors, but each in a unique way. In that sense, Tiles are a bit like us.  Owning a Tile is an invitation to participate in the TileDAO, which receives all revenue from the Tiles primary sale.  Because the supply is virtually infinite, funding for the DAO may continue indefinitely, as long as Tiles are sold. @peripheralist';

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

  function prepareImageSeed(address _tile)
    internal
    view
    returns (
      uint16[4][10] memory addressSegments,
      uint8 ringsCount,
      Ring[] memory rings
    )
  {
    uint16[] memory chars = bytesToChars(_tile);

    for (uint16 i; i != 10; ) {
      addressSegments[i][0] = chars[i * 4 + 0];
      addressSegments[i][1] = chars[i * 4 + 1];
      addressSegments[i][2] = chars[i * 4 + 2];
      addressSegments[i][3] = chars[i * 4 + 3];
      ++i;
    }

    uint160[2] memory indexes = [
      (uint160(_tile) / (16**38)) % 16**2,
      (uint160(_tile) / (16**36)) % 16**2
    ];

    rings = new Ring[](2);
    for (uint256 i; i != 2; ) {
      if (indexes[i] == 0) {
        ++i;
        continue;
      }

      uint160 ringIndex = indexes[i] > 0 ? indexes[i] - 1 : indexes[i];
      rings[ringsCount].positionIndex = positionIndex[ringIndex];
      rings[ringsCount].size = size[ringIndex];
      rings[ringsCount].layer = layer[ringIndex];
      rings[ringsCount].positionKind = positionKind[ringIndex];
      rings[ringsCount].solid = solid[ringIndex];
      ++ringsCount;
      ++i;
    }
  }

  /**
   * @notice Returns base-64 encoded image content
   */
  function prepareImageContent(
    uint16[4][10] memory addressSegments,
    uint8 ringsCount,
    Ring[] memory rings
  ) internal view returns (string memory image) {
    image = svgHeader;

    for (uint8 r; r != 3; ) {
      for (uint8 i; i != 9; ) {
        (string memory svg, string memory color) = generateTileSectors(addressSegments, i, r);
        if (StringHelpers.stringStartsWith(svg, '<path')) {
          image = string(
            abi.encodePacked(
              image,
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
          image = string(
            abi.encodePacked(
              image,
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

        ++i;
      }

      for (uint8 i; i < ringsCount; ) {
        Ring memory ring = rings[i];
        if (ring.layer != r) {
          ++i;
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

        image = string(
          abi.encodePacked(
            image,
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

        ++i;
      }

      ++r;
    }

    image = string(abi.encodePacked(image, svgFooter));

    image = Base64.encode(bytes(string(abi.encodePacked(image))));
  }

  /**
   * @notice Returns plain text JSON traits array.
   */
  function prepareTraitsContent(
    uint16[4][10] memory addressSegments,
    uint8 ringsCount,
    Ring[] memory rings
  ) internal view returns (string memory traits) {
    string memory circleColorTraits;
    string memory ringTraits;

    uint16 circleCount;
    for (uint8 r; r != 3; ) {
      for (uint8 i; i != 9; ) {
        (string memory svg, string memory color) = generateTileSectors(addressSegments, i, r);

        if (StringHelpers.stringStartsWith(svg, '<circle')) {
          ++circleCount;
          circleColorTraits = string(
            abi.encodePacked(
              circleColorTraits,
              (bytes(circleColorTraits).length == 0 ? '' : ', '),
              '{ "trait_type": "Circle ',
              Strings.toString(circleCount),
              ' Color", "value": "',
              color,
              '" }'
            )
          );
        }

        ++i;
      }

      for (uint8 i; i != ringsCount; ) {
        Ring memory ring = rings[i];
        if (ring.layer != r) {
          ++i;
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

        ++i; // NOTE: we want to increment this before printing traits

        ringTraits = string(
          abi.encodePacked(
            ringTraits,
            (bytes(ringTraits).length == 0 ? '' : ', '),
            '{ "trait_type": "Ring ',
            Strings.toString(i),
            ' X", "value": "',
            Strings.toString(posX),
            '" }, ',
            '{ "trait_type": "Ring ',
            Strings.toString(i),
            ' Y", "value": "',
            Strings.toString(posY),
            '" }, ',
            '{ "trait_type": "Ring ',
            Strings.toString(i),
            ' Diameter", "value": "',
            Strings.toString(diameter10x),
            '" }'
          )
        );
      }
      ++r;
    }

    traits = string(
      abi.encodePacked(
        '[ ',
        ringTraits,
        (bytes(ringTraits).length == 0 ? '' : ', '),
        '{ "trait_type": "Ring Count", "value": "',
        Strings.toString(uint256(uint8(ringsCount))),
        '" }',
        (bytes(circleColorTraits).length == 0 ? '' : ', '),
        circleColorTraits,
        ' ]'
      )
    );
  }

  /**
   * @notice Returns full NFT metadata JSON including image content and traits.
   */
  function getSvgContent(address _tile) public view override returns (string memory) {
    uint16[4][10] memory addressSegments;
    uint8 ringsCount;
    Ring[] memory rings;

    (addressSegments, ringsCount, rings) = prepareImageSeed(_tile);

    string memory traits = prepareTraitsContent(addressSegments, ringsCount, rings);

    string memory image = prepareImageContent(addressSegments, ringsCount, rings);

    string memory json = Base64.encode(
      bytes(
        string(
          abi.encodePacked(
            '{ "name": "0x',
            StringHelpers.toAsciiString(_tile),
            '", "description": "',
            description,
            '", "attributes": ',
            traits,
            ', "image": "data:image/svg+xml;base64,',
            image,
            '", "image_data": "data:image/svg+xml;base64,',
            image,
            '" }'
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
