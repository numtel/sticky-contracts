// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./MockERC20.sol";

contract MockSwapHelper {
  address public inputToken;
  address public outputToken;
  uint public ratio;

  constructor(
    address _inputToken,
    address _outputToken,
    uint _ratio
  ) {
    inputToken = _inputToken;
    outputToken = _outputToken;
    ratio = _ratio;
  }

  function swap(address recipient) external {
    uint amountIn = MockERC20(inputToken).balanceOf(address(this));
    MockERC20(outputToken).mint(recipient, amountIn * ratio);
  }
}
