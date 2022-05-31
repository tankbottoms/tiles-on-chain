// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.6;

import '../lib/forge-std/src/console2.sol';
import '../lib/forge-std/src/Test.sol';
import '../lib/forge-std/src/Vm.sol';

import '../contracts/SupplyPriceResolver.sol';

contract SupplyPriceResolverTest is Test {
  SupplyPriceResolver linearResolver;
  SupplyPriceResolver exponentialResolver;

  uint256 basePrice = 1000000000000; // 0.000001 eth
  uint256 multiplier = 2;
  uint256 tierSize = 400;
  uint256 priceCap = 1000000000000000000000; // 1000.0 eth

  function setUp() public {
    linearResolver = new SupplyPriceResolver(
      basePrice,
      multiplier,
      tierSize,
      priceCap,
      SupplyPriceResolver.PriceFunction.LINEAR
    );
    exponentialResolver = new SupplyPriceResolver(
      basePrice,
      multiplier,
      tierSize,
      priceCap,
      SupplyPriceResolver.PriceFunction.EXP
    );
  }

  function testLinearPriceUnsupported() public {
    vm.expectRevert(bytes4(keccak256(bytes('UNSUPPORTED_OPERATION()'))));
    linearResolver.getPrice();

    vm.expectRevert(bytes4(keccak256(bytes('UNSUPPORTED_OPERATION()'))));
    linearResolver.getPriceFor(address(0));

    vm.expectRevert(bytes4(keccak256(bytes('UNSUPPORTED_OPERATION()'))));
    linearResolver.getPriceOf(0);
  }

  function testLinearPriceParams() public {
    bytes memory params = abi.encodePacked(uint256(0));
    uint256 price = linearResolver.getPriceWithParams(address(1), 0, params);
    assert(price == 1000000000000);

    params = abi.encodePacked(uint256(100));
    price = linearResolver.getPriceWithParams(address(1), 0, params);
    assert(price == 1000000000000);

    params = abi.encodePacked(uint256(tierSize + 1));
    price = linearResolver.getPriceWithParams(address(1), 0, params);
    assert(price == 2000000000000);

    params = abi.encodePacked(uint256(tierSize * 3 + 1));
    price = linearResolver.getPriceWithParams(address(1), 0, params);
    assert(price == 6000000000000);

    params = abi.encodePacked(uint256(tierSize * 100 + 1));
    price = linearResolver.getPriceWithParams(address(1), 0, params);
    assert(price == 200000000000000);
  }

  function testExponentialPriceUnsupported() public {
    vm.expectRevert(bytes4(keccak256(bytes('UNSUPPORTED_OPERATION()'))));
    exponentialResolver.getPrice();

    vm.expectRevert(bytes4(keccak256(bytes('UNSUPPORTED_OPERATION()'))));
    exponentialResolver.getPriceFor(address(0));

    vm.expectRevert(bytes4(keccak256(bytes('UNSUPPORTED_OPERATION()'))));
    exponentialResolver.getPriceOf(0);
  }

  function testExponentialPriceParams() public {
    bytes memory params = abi.encodePacked(uint256(0));
    uint256 price = exponentialResolver.getPriceWithParams(address(1), 0, params);
    assert(price == 1000000000000);

    params = abi.encodePacked(uint256(100));
    price = exponentialResolver.getPriceWithParams(address(1), 0, params);
    assert(price == 1000000000000);

    params = abi.encodePacked(uint256(tierSize * 2 + 1));
    price = exponentialResolver.getPriceWithParams(address(1), 0, params);
    assert(price == 4000000000000);

    params = abi.encodePacked(uint256(tierSize * 3 + 1));
    price = exponentialResolver.getPriceWithParams(address(1), 0, params);
    assert(price == 8000000000000);

    params = abi.encodePacked(uint256(tierSize * 100 + 1));
    price = exponentialResolver.getPriceWithParams(address(1), 0, params);
    assert(price == 1000000000000000000000);
  }
}
