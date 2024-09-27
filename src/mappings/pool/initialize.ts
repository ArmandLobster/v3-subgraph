import { BigInt } from '@graphprotocol/graph-ts'

import { Pool } from '../../../generated/schema'
import { Initialize } from '../../../generated/templates/Pool/Pool'
import { updatePoolHourData } from '../../utils/intervalUpdates'

export function handleInitialize(event: Initialize): void {
  handleInitializeHelper(event)
}

export function handleInitializeHelper(event: Initialize): void {
  // update pool sqrt price and tick
  const pool = Pool.load(event.address.toHexString())!
  pool.sqrtPrice = event.params.sqrtPriceX96
  pool.tick = BigInt.fromI32(event.params.tick)
  pool.save()

  updatePoolHourData(event)
}
