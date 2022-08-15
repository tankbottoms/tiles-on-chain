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

import '@jbx-protocol/contracts-v2/contracts/interfaces/IJBDirectory.sol';
import '@jbx-protocol/contracts-v2/contracts/interfaces/IJBPaymentTerminal.sol';
import '@jbx-protocol/contracts-v2/contracts/libraries/JBTokens.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import './interfaces/IPriceResolver.sol';
import './interfaces/ITileNFT.sol';
import './interfaces/ITileContentProvider.sol';
import './components/ERC721Enumerable.sol';

contract TileNFT is ERC721Enumerable, Ownable, ReentrancyGuard, ITileNFT {
  error INCORRECT_PRICE();
  error UNSUPPORTED_OPERATION();
  error PRIVILEDGED_OPERATION();
  error INVALID_ADDRESS();
  error INVALID_TOKEN();
  error INVALID_AMOUNT();
  error ALREADY_MINTED();

  string public baseUri;
  IPriceResolver private priceResolver;
  ITileContentProvider private tokenUriResolver;
  mapping(address => bool) private minters;
  IJBDirectory private jbxDirectory;
  uint256 jbxProjectId;

  /**
    @notice
    URI containing OpenSea-style metadata.
  */
  string private _contractUri;

  /**
    @notice Maps token id to address used to generate content of that NFT. This does not track ownership.
   */
  mapping(address => uint256) public override idForAddress;

  /**
    @notice Maps the address used for NFT content to the token id of that object. This does not track ownership.
   */
  mapping(uint256 => address) public override addressForId;

  //*********************************************************************//
  // -------------------------- constructor ---------------------------- //
  //*********************************************************************//
  /**
    @notice 

    @param _name Token name.
    @param _symbol Token symbol.
    @param _baseUri Token base URI if URI resolver is not present.
    @param _priceResolver Price resolver.
    @param _tokenUriResolver Token URI resolver.
    @param _jbxDirectory Jukebox project directory.
    @param _jbxProjectId Juicebox project id.
    @param _metadataUri OpenSea-style contract metadata.
   */
  constructor(
    string memory _name,
    string memory _symbol,
    string memory _baseUri,
    IPriceResolver _priceResolver,
    ITileContentProvider _tokenUriResolver,
    IJBDirectory _jbxDirectory,
    uint256 _jbxProjectId,
    string memory _metadataUri
  ) ERC721Enumerable(_name, _symbol) {
    baseUri = _baseUri;
    priceResolver = _priceResolver;
    tokenUriResolver = _tokenUriResolver;
    jbxDirectory = _jbxDirectory;
    jbxProjectId = _jbxProjectId;
    _contractUri = _metadataUri;

    if (address(_tokenUriResolver) != address(0)) {
      _tokenUriResolver.setParent(ITileNFT(address(this)));
    }
  }

  //*********************************************************************//
  // ------------------------- external views -------------------------- //
  //*********************************************************************//

  function tokenURI(uint256 tokenId) public view override returns (string memory uri) {
    if (_ownerOf[tokenId] == address(0)) {
        uri = '';
    } else if (address(tokenUriResolver) != address(0)) {
      uri = tokenUriResolver.tokenUri(tokenId);
    } else {
      uri = baseUri;
    }
  }

  function contractURI() public view override returns (string memory contractUri) {
    contractUri = _contractUri;
  }

  //*********************************************************************//
  // ---------------------- external transactions ---------------------- //
  //*********************************************************************//

  /**
    @notice Allows minting by anyone at the correct price.
  */
  function mint() external payable override nonReentrant returns (uint256 mintedTokenId) {
    if (address(priceResolver) == address(0)) {
      revert UNSUPPORTED_OPERATION();
    }

    if (
      msg.value != priceResolver.getPriceWithParams(msg.sender, 0, abi.encodePacked(totalSupply()))
    ) {
      revert INCORRECT_PRICE();
    }

    _payTreasury();

    mintedTokenId = _mint(msg.sender, msg.sender);
  }

  function grab(address tile)
    external
    payable
    override
    nonReentrant
    returns (uint256 mintedTokenId)
  {
    if (address(priceResolver) == address(0)) {
      revert UNSUPPORTED_OPERATION();
    }

    if (
      msg.value !=
      priceResolver.getPriceWithParams(msg.sender, 0, abi.encodePacked(totalSupply(), tile))
    ) {
      revert INCORRECT_PRICE();
    }

    _payTreasury();

    mintedTokenId = _mint(msg.sender, tile);
  }

  /**
    @notice Allows minting by anyone in the merkle root of the registered price resolver.
    */
  function merkleMint(
    uint256 index,
    address tile,
    bytes calldata proof
  ) external payable override nonReentrant returns (uint256 mintedTokenId) {
    if (address(priceResolver) == address(0)) {
      revert UNSUPPORTED_OPERATION();
    }

    if (msg.value != priceResolver.getPriceWithParams(msg.sender, index, proof)) {
      revert INCORRECT_PRICE();
    }

    _payTreasury();

    mintedTokenId = _mint(msg.sender, tile);
  }

  /**
    @notice 
    */
  function seize() external payable override returns (uint256 tokenId) {
    tokenId = idForAddress[msg.sender];

    if (tokenId == 0) {
      revert INVALID_TOKEN();
    }

    address owner = ownerOf(tokenId);
    if (owner == msg.sender) {
      revert UNSUPPORTED_OPERATION();
    }

    if (
      msg.value !=
      priceResolver.getPriceWithParams(msg.sender, tokenId, abi.encodePacked(totalSupply()))
    ) {
      revert INCORRECT_PRICE();
    }

    require(payable(owner).send(msg.value));

    _reassign(owner, msg.sender, tokenId);
  }

  function transferFrom(
    address _from,
    address _to,
    uint256 _tokenId
  ) public override {
    _beforeTokenTransfer(_from, _to, _tokenId);
    super.transferFrom(_from, _to, _tokenId);
  }

  function safeTransferFrom(
    address _from,
    address _to,
    uint256 _tokenId
  ) public override {
    _beforeTokenTransfer(_from, _to, _tokenId);
    super.safeTransferFrom(_from, _to, _tokenId);
  }

  function safeTransferFrom(
    address _from,
    address _to,
    uint256 _tokenId,
    bytes calldata _data
  ) public override {
    _beforeTokenTransfer(_from, _to, _tokenId);
    super.safeTransferFrom(_from, _to, _tokenId, _data);
  }

  //*********************************************************************//
  // -------------------- priviledged transactions --------------------- //
  //*********************************************************************//

  /**
    @notice Allows direct mint by priviledged accounts bypassing price checks.
    */
  function superMint(address _account, address _tile)
    external
    payable
    override
    nonReentrant
    onlyMinter(msg.sender)
    returns (uint256 mintedTokenId)
  {
    mintedTokenId = _mint(_account, _tile);
  }

  /**
    @notice Adds a priviledged minter account.
    */
  function registerMinter(address _minter) external override onlyOwner {
    minters[_minter] = true;
  }

  /**
    @notice Removes a priviledged minter account.
    */
  function removeMinter(address _minter) external override onlyOwner {
    minters[_minter] = false;
  }

  /**
    @notice Changes the associated price resolver.
    */
  function setPriceResolver(IPriceResolver _priceResolver) external override onlyOwner {
    priceResolver = _priceResolver;
  }

  /**
    @notice Changes contract metadata uri.
    */
  function setContractUri(string calldata contractUri) external override onlyOwner {
    _contractUri = contractUri;
  }

  /**
    @notice Allows owner to tranfer ether balance.
    */
  function transferBalance(address payable account, uint256 amount) external override onlyOwner {
    if (account == address(0)) {
      revert INVALID_ADDRESS();
    }

    if (amount == 0 || amount > (payable(address(this))).balance) {
      revert INVALID_AMOUNT();
    }

    account.transfer(amount);
  }

  function transferTokenBalance(
    IERC20 token,
    address to,
    uint256 amount
  ) external override onlyOwner {
    token.transfer(to, amount);
  }

  /**
    @notice Changes the associated price resolver.
    */
  function setTokenUriResolver(ITileContentProvider _tokenUriResolver) external override onlyOwner {
    tokenUriResolver = _tokenUriResolver;
  }

  //*********************************************************************//
  // ----------------------- private transactions ---------------------- //
  //*********************************************************************//

  /**
   */
  function _payTreasury() private {
    IJBPaymentTerminal terminal = jbxDirectory.primaryTerminalOf(jbxProjectId, JBTokens.ETH);
    if (address(terminal) == address(0)) {
      return;
    }

    terminal.pay(jbxProjectId, msg.value, JBTokens.ETH, msg.sender, 0, false, '', '');
  }

  /**
    @notice Mints the token, returns minted token id.

    @param owner Owner of the new token.
    @param tile Address to generate the tile from.
    */
  function _mint(address owner, address tile) private returns (uint256 tokenId) {
    tokenId = totalSupply() + 1;

    if (idForAddress[tile] != 0) {
      revert ALREADY_MINTED();
    }

    addressForId[tokenId] = tile;
    idForAddress[tile] = tokenId;

    _beforeTokenTransfer(address(0), owner, tokenId);

    _mint(owner, tokenId);
  }

  /**
    @notice 
    */
  function _reassign(
    address from,
    address to,
    uint256 tokenId
  ) private {
    require(to != address(0), 'INVALID_RECIPIENT');

    _beforeTokenTransfer(from, to, tokenId);

    unchecked {
      _balanceOf[from]--;
      _balanceOf[to]++;
    }

    _ownerOf[tokenId] = to;

    delete getApproved[tokenId];

    emit Transfer(from, to, tokenId);
  }

  /**
    @notice Validate that the caller is in the minter list.
    */
  modifier onlyMinter(address _account) {
    if (_account != owner() && !minters[_account]) {
      revert PRIVILEDGED_OPERATION();
    }
    _;
  }
}
