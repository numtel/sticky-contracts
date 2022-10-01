// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IERC20.sol";
import "./safeTransfer.sol";

interface IChainlinkFeed {
  function latestAnswer() external view returns(uint256);
  function decimals() external view returns(uint8);
}

interface IUniswapV2Pair {
  function token0() external view returns(address);
  function token1() external view returns(address);
  function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
}

contract UniswapV2Helper {
  IChainlinkFeed public inputPriceFeed;
  IChainlinkFeed public outputPriceFeed;
  IUniswapV2Pair public liquidityPool;
  address public inputToken;
  address public outputToken;
  bool public inputIsToken0;

  uint public slippageNumerator;
  uint public slippageDenominator;

  constructor(
    IChainlinkFeed _inputPriceFeed,
    IChainlinkFeed _outputPriceFeed,
    IUniswapV2Pair _liquidityPool,
    address _inputToken,
    address _outputToken,
    uint _slippageNumerator,
    uint _slippageDenominator
  ) {
    slippageNumerator = _slippageNumerator;
    slippageDenominator = _slippageDenominator;
    require(slippageNumerator < slippageDenominator, 'INVALID_SLIPPAGE');
    inputPriceFeed = _inputPriceFeed;
    outputPriceFeed = _outputPriceFeed;
    require(inputPriceFeed.decimals() == outputPriceFeed.decimals(), 'FEED_MISMATCH');

    liquidityPool = _liquidityPool;
    inputToken = _inputToken;
    outputToken = _outputToken;
    address token0 = liquidityPool.token0();
    address token1 = liquidityPool.token1();
    require(
      (token0 == inputToken && token1 == outputToken) ||
      (token1 == inputToken && token0 == outputToken), 'POOL_MISMATCH');
    if(token0 == inputToken) {
      inputIsToken0 = true;
    }
  }

  function swap(address recipient) external {
    uint amountIn = IERC20(inputToken).balanceOf(address(this));
    uint minOut =
      (amountIn * inputPriceFeed.latestAnswer() * slippageNumerator)
      / (outputPriceFeed.latestAnswer() * slippageDenominator);

    safeTransfer.invoke(inputToken, address(liquidityPool), amountIn);
    if(inputIsToken0) {
      liquidityPool.swap(0, minOut, recipient, "");
    } else {
      liquidityPool.swap(minOut, 0, recipient, "");
    }
  }


}
