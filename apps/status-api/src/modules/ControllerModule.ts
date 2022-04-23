import { CacheModule, Module } from '@nestjs/common'
import { ActuatorController } from '@defichain-apps/libs/actuator'
import { BlockchainStatusController } from '../controllers/BlockchainStatusController'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { ConfigService } from '@nestjs/config'
import { SemaphoreCache } from '../../../whale/src/module.api/cache/semaphore.cache'
import { OracleStatusController } from '../controllers/OracleStatusController'
import { OverallStatusController } from '../controllers/OverallStatusController'

/**
 * Exposed ApiModule for public interfacing
 */
@Module({
  imports: [
    CacheModule.register()
  ],
  controllers: [
    ActuatorController,
    BlockchainStatusController,
    ActuatorController,
    OracleStatusController,
    OverallStatusController
  ],
  providers: [
    BlockchainStatusController,
    {
      provide: WhaleApiClient,
      useFactory: (configService: ConfigService): WhaleApiClient => {
        return new WhaleApiClient({
          version: 'v0',
          network: configService.get<string>('network'),
          url: 'https://ocean.defichain.com'
        })
      },
      inject: [ConfigService]
    },
    SemaphoreCache
  ]
})
export class ControllerModule {
}