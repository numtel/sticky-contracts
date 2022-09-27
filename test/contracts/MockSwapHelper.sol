// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./MockERC20.sol";

contract MockSwapHelper {
  address public fromToken;
  address public toToken;
  uint public ratio;

  constructor(
    address _fromToken,
    address _toToken,
    uint _ratio
  ) {
    fromToken = _fromToken;
    toToken = _toToken;
    ratio = _ratio;
  }

  function swap(address recipient) external {
    uint amountIn = MockERC20(fromToken).balanceOf(address(this));
    MockERC20(toToken).mint(recipient, amountIn * ratio);
  }
}
