import { BigInt, log } from '@graphprotocol/graph-ts'

import { populateEmptyPools } from '../backfill'
import { getSubgraphConfig, SubgraphConfig } from '../utils/chains'
import { fetchTokenDecimals, fetchTokenName, fetchTokenSymbol, fetchTokenTotalSupply } from '../utils/token'
import { ADDRESS_ZERO, ONE_BI, ZERO_BD, ZERO_BI } from './../utils/constants'
import { PoolCreated } from '../../generated/Factory/Factory'
import { Factory, Pool, Token } from '../../generated/schema'
import { Pool as PoolTemplate } from '../../generated/templates'

// The subgraph handler must have this signature to be able to handle events,
// however, we invoke a helper in order to inject dependencies for unit tests.
export function handlePoolCreated(event: PoolCreated): void {
  handlePoolCreatedHelper(event)
}

// Exported for unit tests
export function handlePoolCreatedHelper(
  event: PoolCreated,
  subgraphConfig: SubgraphConfig = getSubgraphConfig(),
): void {
  const factoryAddress = subgraphConfig.factoryAddress
  const whitelistTokens = subgraphConfig.whitelistTokens
  const tokenOverrides = subgraphConfig.tokenOverrides
  const poolsToSkip = subgraphConfig.poolsToSkip
  const poolMappings = subgraphConfig.poolMappings

  // temp fix
  if (poolsToSkip.includes(event.params.pool.toHexString())) {
    return
  }

  // load factory
  let factory = Factory.load(factoryAddress)
  if (factory === null) {
    factory = new Factory(factoryAddress)
    factory.poolCount = ZERO_BI
    factory.txCount = ZERO_BI
    factory.owner = ADDRESS_ZERO
    populateEmptyPools(event, poolMappings, whitelistTokens, tokenOverrides)
  }
  factory.save()
}
