import { BigDecimal, BigInt } from '@graphprotocol/graph-ts'

import { Pool, Token } from '../../../generated/schema'
import { Swap as SwapEvent } from '../../../generated/templates/Pool/Pool'
import { convertTokenToDecimal } from '../../utils'
import { ONE_BI, ZERO_BD } from '../../utils/constants'
import { updatePoolHourData } from '../../utils/intervalUpdates'
import { sqrtPriceX96ToTokenPrices } from '../../utils/pricing'

export function handleSwap(event: SwapEvent): void {
  handleSwapHelper(event)
}

export function handleSwapHelper(event: SwapEvent): void {
  const pool = Pool.load(event.address.toHexString())!

  // hot fix for bad pricing
  if (pool.id == '0x9663f2ca0454accad3e094448ea6f77443880454') {
    return
  }

  const token0 = Token.load(pool.token0)
  const token1 = Token.load(pool.token1)

  if (token0 && token1) {
    // amounts - 0/1 are token deltas: can be positive or negative
    const amount0 = convertTokenToDecimal(event.params.amount0, token0.decimals)
    const amount1 = convertTokenToDecimal(event.params.amount1, token1.decimals)

    // need absolute amounts for volume
    let amount0Abs = amount0
    if (amount0.lt(ZERO_BD)) {
      amount0Abs = amount0.times(BigDecimal.fromString('-1'))
    }
    let amount1Abs = amount1
    if (amount1.lt(ZERO_BD)) {
      amount1Abs = amount1.times(BigDecimal.fromString('-1'))
    }

    // pool volume
    pool.volumeToken0 = pool.volumeToken0.plus(amount0Abs)
    pool.volumeToken1 = pool.volumeToken1.plus(amount1Abs)
    pool.txCount = pool.txCount.plus(ONE_BI)

    // Update the pool with the new active liquidity, price, and tick.
    pool.liquidity = event.params.liquidity
    pool.tick = BigInt.fromI32(event.params.tick as i32)
    pool.sqrtPrice = event.params.sqrtPriceX96

    // updated pool ratess
    const prices = sqrtPriceX96ToTokenPrices(pool.sqrtPrice, token0 as Token, token1 as Token)
    pool.token0Price = prices[0]
    pool.token1Price = prices[1]
    pool.save()

    // interval data
    const poolHourData = updatePoolHourData(event)

    // update volume metrics
    poolHourData.volumeToken0 = poolHourData.volumeToken0.plus(amount0Abs)
    poolHourData.volumeToken1 = poolHourData.volumeToken1.plus(amount1Abs)

    poolHourData.save()
    pool.save()
  }
}
