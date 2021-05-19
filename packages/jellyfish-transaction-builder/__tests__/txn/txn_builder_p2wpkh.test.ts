import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTxnBuilder } from '../../src'
import { fundEllipticPair } from '../test.utils'
import { OP_DEFI_TX } from '@defichain/jellyfish-transaction/dist/script/defi'
import { CDfTx } from '@defichain/jellyfish-transaction/dist/script/defi/dftx'
import { OP_CODES } from '@defichain/jellyfish-transaction/dist'
import { DeFiOpUnmapped } from '@defichain/jellyfish-transaction/src/script/defi/dftx_unmapped'

// P2WPKHTxnBuilder is abstact and not instantiable
class TestBuilder extends P2WPKHTxnBuilder {}

const container = new MasterNodeRegTestContainer()
let providers: MockProviders
let builder: TestBuilder

const dummyDfTx = new OP_DEFI_TX({
  signature: CDfTx.SIGNATURE,
  type: 0x01,
  name: 'dummy',
  data: {
    // dummy, unmapped dftx
    hex: '001234'
  }
})

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()

  providers = await getProviders(container)
  builder = new TestBuilder(providers.fee, providers.prevout, providers.elliptic)
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  await providers.randomizeEllipticPair()
  await container.waitForWalletBalanceGTE(101)

  await fundEllipticPair(container, providers.elliptic.ellipticPair, 1.1) // 1.1
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 5.5) // 6.6
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 10.566) // 17.166
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 15.51345) // 32.67945
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 20) // 52.67945
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 37.98) // 90.65945
  await fundEllipticPair(container, providers.elliptic.ellipticPair, 9.34055) // 100

  await providers.setupMocks()
})

describe('createDeFiTx()', () => {
  it('should creat DfTx stack correctly and return change as vout', async () => {
    const change = await providers.elliptic.script()
    const result = await builder.createDeFiTx(dummyDfTx, change)

    expect(result.vin.length).toEqual(7)
    expect(result.vout.length).toEqual(2) // 1 DfTx, 1 change
    expect(result.vout[0].value).toEqual(new BigNumber(0))
    expect(result.vout[1].script).toEqual(change)

    // under normal (non test) env, only required amount of prevout will be taken and aggregated
    // test provider here simply collect everything
    expect(result.vout[1].value.gt(99.999)).toBeTruthy()
    expect(result.vout[1].value.lt(100)).toBeTruthy()

    expect(result.vout[0].script.stack.length).toEqual(2)
    expect(result.vout[0].script.stack[0]).toEqual(OP_CODES.OP_RETURN)
    expect(result.vout[0].script.stack[1].type).toEqual('OP_DEFI_TX')

    const tx = (result.vout[0].script.stack[1] as OP_DEFI_TX).tx
    expect(tx.signature).toBe(1147556984)
    expect(tx.type).toBe(0x01)
    expect(tx.name).toBe('OP_DEFI_TX_UNMAPPED')

    const unmapped = tx.data as DeFiOpUnmapped
    expect(unmapped.hex).toBe('001234')
  })

  it('balance should be deducted accordingly based on spent on DfTx', async () => {
    const spendAmount = new BigNumber(34.56) // eg: utxosToAccount, the custom tx costed this

    const change = await providers.elliptic.script()
    const result = await builder.createDeFiTx(dummyDfTx, change, spendAmount)

    expect(result.vin.length).toEqual(7)
    expect(result.vout.length).toEqual(2) // 1 DfTx, 1 change
    expect(result.vout[0].value).toEqual(spendAmount)
    expect(result.vout[1].script).toEqual(change)
    expect(result.vout[1].value.gt(new BigNumber(99.999).minus(spendAmount))).toBeTruthy()
    expect(result.vout[1].value.lt(new BigNumber(100).minus(spendAmount))).toBeTruthy()
  })
})