// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ERC20.sol";
import "./IERC20.sol";
import "./IPool.sol";
import "./safeTransfer.sol";
import "./Ownable.sol";

contract StickyAavePool is ERC20, Ownable {
  IPool public aavePool;
  address public aToken;
  address public baseToken;
  address public factory;

  string public name;
  string public symbol;
  uint8 public decimals;

  event FactoryChanged(address indexed oldFactory, address indexed newFactory);

  constructor(
    IPool _aavePool,
    address _aToken,
    address _baseToken,
    address _factory,
    string memory _name,
    string memory _symbol
  ) {
    aavePool = _aavePool;
    aToken = _aToken;
    baseToken = _baseToken;
    factory = _factory;
    name = _name;
    symbol = _symbol;
    decimals = IERC20(baseToken).decimals();
    _transferOwnership(msg.sender);
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

  function interestToken() public view returns(address) {
    return baseToken;
  }

  function interestAvailable() public view returns(uint) {
    return ERC20(aToken).balanceOf(address(this)) - totalSupply;
  }

  function setFactory(address newFactory) external onlyOwner {
    emit FactoryChanged(factory, newFactory);
    factory = newFactory;
  }

  function transferOwnership(address newOwner) external onlyOwner {
    _transferOwnership(newOwner);
  }

  function collectInterest() external {
    require(msg.sender == factory);
    aavePool.withdraw(baseToken, interestAvailable(), factory);
  }
}
