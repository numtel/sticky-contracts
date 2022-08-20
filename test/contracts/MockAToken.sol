// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract MockAToken {
  uint public scaleNumerator;
  uint public scaleDenominator;
  uint public totalSupply;
  uint public scaledTotalSupply;

  mapping(address => uint) public balanceOf;

  constructor(
    uint _scaleNumerator,
    uint _scaleDenominator
  ) {
    scaleNumerator = _scaleNumerator;
    scaleDenominator = _scaleDenominator;
  }

  function mint(address user, uint amount) external {
    balanceOf[user] += amount;
    totalSupply += amount;
    //updateScaledSupply();
  }

  function setScaleNumerator(uint newValue) external {
    scaleNumerator = newValue;
  }

  function updateScaledSupply() internal {
    scaledTotalSupply = (totalSupply * scaleNumerator) / scaleDenominator;
  }

  function scaledBalanceOf(address user) external view returns (uint) {
    return (balanceOf[user] * scaleNumerator) / scaleDenominator;
  }
}
