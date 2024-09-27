import { BigInt } from '@graphprotocol/graph-ts'
import { Pool } from '../../../generated/schema'
import { Burn as BurnEvent } from '../../../generated/templates/Pool/Pool'
import { ONE_BI } from '../../utils/constants'
import { updatePoolHourData } from '../../utils/intervalUpdates'

export function handleBurn(event: BurnEvent): void {
  handleBurnHelper(event)
}

// Note: this handler need not adjust TVL because that is accounted for in the handleCollect handler
export function handleBurnHelper(event: BurnEvent): void {
  const poolAddress = event.address.toHexString()
  const pool = Pool.load(poolAddress)!

  // pool data
  pool.txCount = pool.txCount.plus(ONE_BI)
  // Pools liquidity tracks the currently active liquidity given pools current tick.
  // We only want to update it on burn if the position being burnt includes the current tick.
  if (
    pool.tick !== null &&
    BigInt.fromI32(event.params.tickLower).le(pool.tick as BigInt) &&
    BigInt.fromI32(event.params.tickUpper).gt(pool.tick as BigInt)
  ) {
    // todo: this liquidity can be calculated from the real reserves and
    // current price instead of incrementally from every burned amount which
    // may not be accurate: https://linear.app/uniswap/issue/DAT-336/fix-pool-liquidity
    pool.liquidity = pool.liquidity.minus(event.params.amount)
  }

  updatePoolHourData(event)
  pool.save()
}
