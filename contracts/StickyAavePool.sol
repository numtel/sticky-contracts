// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ERC20.sol";
import "./IPool.sol";
import "./safeTransfer.sol";

contract StickyAavePool is ERC20 {
  IPool public aavePool;
  address public aToken;
  address public baseToken;
  address public factory;

  constructor(
    IPool _aavePool,
    address _aToken,
    address _baseToken,
    address _factory
  ) {
    aavePool = _aavePool;
    aToken = _aToken;
    baseToken = _baseToken;
    factory = _factory;
  }

  function mint(uint amountIn) external {
    _mint(msg.sender, amountIn);
    safeTransfer.invokeFrom(baseToken, msg.sender, address(this), amountIn);
    ERC20(baseToken).approve(address(aavePool), amountIn);
    aavePool.supply(baseToken, amountIn, address(this), 0);
  }

  function burn(uint amountOut) external {
    _burn(msg.sender, amountOut);
    aavePool.withdraw(baseToken, amountOut, msg.sender);
  }

  function interestAvailable() public view returns(uint) {
    return ERC20(aToken).balanceOf(address(this)) - totalSupply;
  }

  function collectInterest() external {
    require(msg.sender == factory);
    aavePool.withdraw(baseToken, interestAvailable(), factory);
  }
}
