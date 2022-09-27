// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./MockAToken.sol";
import "../../contracts/IERC20.sol";

contract MockPool {
  IERC20 underlying;
  MockAToken aToken;
  
  constructor(IERC20 _underlying, MockAToken _aToken) {
    underlying = _underlying;
    aToken = _aToken;
  }

  function supply(
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) external {
    underlying.transferFrom(msg.sender, address(this), amount);
    aToken.mint(onBehalfOf, amount);
  }

  function withdraw(
    address asset,
    uint256 amount,
    address to
  ) external returns (uint256) {
    underlying.transfer(to, amount);
    aToken.burn(msg.sender, amount);
  }
  
}
