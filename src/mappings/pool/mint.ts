import { BigInt } from '@graphprotocol/graph-ts'
import { Pool, Token } from '../../../generated/schema'
import { Mint as MintEvent } from '../../../generated/templates/Pool/Pool'
import { convertTokenToDecimal } from '../../utils'
import { ONE_BI } from '../../utils/constants'
import { updatePoolHourData } from '../../utils/intervalUpdates'

export function handleMint(event: MintEvent): void {
  handleMintHelper(event)
}

export function handleMintHelper(event: MintEvent): void {
  const poolAddress = event.address.toHexString()
  const pool = Pool.load(poolAddress)!

  const token0 = Token.load(pool.token0)
  const token1 = Token.load(pool.token1)

  if (token0 && token1) {
    const amount0 = convertTokenToDecimal(event.params.amount0, token0.decimals)
    const amount1 = convertTokenToDecimal(event.params.amount1, token1.decimals)

    // pool data
    pool.txCount = pool.txCount.plus(ONE_BI)

    // Pools liquidity tracks the currently active liquidity given pools current tick.
    // We only want to update it on mint if the new position includes the current tick.
    if (
      pool.tick !== null &&
      BigInt.fromI32(event.params.tickLower).le(pool.tick as BigInt) &&
      BigInt.fromI32(event.params.tickUpper).gt(pool.tick as BigInt)
    ) {
      pool.liquidity = pool.liquidity.plus(event.params.amount)
    }

    pool.totalValueLockedToken0 = pool.totalValueLockedToken0.plus(amount0)
    pool.totalValueLockedToken1 = pool.totalValueLockedToken1.plus(amount1)

    updatePoolHourData(event)

    token0.save()
    token1.save()
    pool.save()
  }
}
