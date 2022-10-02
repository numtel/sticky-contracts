// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./MockERC20.sol";

contract MockUniswapV2Pair {
  MockERC20 public token0;
  MockERC20 public token1;

  uint public price0 = 1;
  uint public price1 = 1;

  constructor(MockERC20 _token0, MockERC20 _token1) {
    token0 = _token0;
    token1 = _token1;
  }

  function setPrices(uint _token0, uint _token1) external {
    price0 = _token0;
    price1 = _token1;
  }

  function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external {
    uint amount0In = token0.balanceOf(address(this));
    uint amount1In = token1.balanceOf(address(this));
    token0.transfer(address(0), amount0In);
    token1.transfer(address(0), amount1In);
    if(amount0Out > 0) {
      uint out = (amount1In * price1) / price0;
      require(out >= amount0Out, "TOO_MUCH_SLIPPAGE");
      token0.mint(to, out);
    } else {
      uint out = (amount0In * price0) / price1;
      require(out >= amount1Out, "TOO_MUCH_SLIPPAGE");
      token1.mint(to, out);
    }
  }
}
