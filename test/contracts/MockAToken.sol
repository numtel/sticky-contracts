// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract MockAToken {
  uint public scaleNumerator;
  uint public scaleDenominator;
  uint public totalSupply;
  uint public scaledTotalSupply;

  mapping(address => uint) public _balanceOf;

  constructor(
    uint _scaleNumerator,
    uint _scaleDenominator
  ) {
    scaleNumerator = _scaleNumerator;
    scaleDenominator = _scaleDenominator;
  }

  function mint(address user, uint amount) external {
    _balanceOf[user] += amount;
    totalSupply += amount;
    //updateScaledSupply();
  }

  function burn(address user, uint amount) external {
    _balanceOf[user] -= (amount * scaleDenominator) / scaleNumerator;
    totalSupply -= amount;
  }

  function setScaleNumerator(uint newValue) external {
    scaleNumerator = newValue;
  }

  function updateScaledSupply() internal {
    scaledTotalSupply = (totalSupply * scaleNumerator) / scaleDenominator;
  }

  function balanceOf(address user) external view returns (uint) {
    return (_balanceOf[user] * scaleNumerator) / scaleDenominator;
  }

  // XXX nyi
  function scaledBalanceOf(address user) external view returns (uint) {
    return (_balanceOf[user] * scaleNumerator) / scaleDenominator;
  }
}
