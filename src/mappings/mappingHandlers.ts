import { SubstrateExtrinsic, SubstrateEvent, SubstrateBlock } from "@subql/types";
import { Transfer, BlockEntity, SponsoredPool, UserJoinedPool, User } from "../types";
import { Balance } from "@polkadot/types/interfaces";
import { u8aToHex } from '@polkadot/util'
import {decodeAddress} from '@polkadot/keyring'

export async function handleBlock(block: SubstrateBlock): Promise<void> {
  let record = new BlockEntity(block.block.header.hash.toString());

  record.field1 = block.block.header.number.toNumber();
  await record.save();
}

function ss58ToHex(address: string) {
  const enAdd = u8aToHex(decodeAddress(address));
  return enAdd;
}

export async function handleEvent(event: SubstrateEvent): Promise<void> {
  const [from, to, amount, ...rest] = event.event.data;

  const transfer = new Transfer(`${event.block.block.header.number.toNumber()}-${event.idx}`);

  const address = ss58ToHex(to.toString());
  const pool = await SponsoredPool.get(address);
  
  if (pool) {
    const poolBalance = await api.query.system.account(to.toString());
    pool.amount = poolBalance.data.free.toBigInt();
    await pool.save();
  }

  transfer.blockNumber = event.block.block.header.number.toBigInt();
  transfer.from = from.toString();
  transfer.to = to.toString();
  transfer.amount = (amount as Balance).toBigInt();
  await transfer.save();
}

export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
  const record = await BlockEntity.get(extrinsic.block.block.header.hash.toString());

  record.field4 = extrinsic.block.timestamp;
  record.field5 = true;
  await record.save();
}

// index create sponsored pool to show list of them in dashboard. Temporary get data from args.
export async function handleCreateSponsoredPool(event: SubstrateEvent): Promise<void> {
  logger.info(`created pool ${event.block.hash.toString()}`);
  const {
    extrinsic: eventExtrinsic,
    event: {
      data: [poolId]
    }
  } = event;
  
  if (eventExtrinsic && poolId) {
    const { extrinsic, block, success } = eventExtrinsic;
    if (success) {
      const createdPool = new SponsoredPool(poolId.toString());

      createdPool.createdAt = block.timestamp;
      createdPool.poolOwner = extrinsic.signer.toString();
      createdPool.targets = extrinsic.args[0] as unknown as string[];
      createdPool.amount = extrinsic.args[1] as unknown as bigint;
      createdPool.discount = extrinsic.args[2] as unknown as number;
      createdPool.txLimit = extrinsic.args[3] as unknown as number;
      createdPool.totalUsers = 0;
      await createdPool.save();
    }
  }
}

export async function handleUserJoinPool(event: SubstrateEvent): Promise<void> {
  const userJoined = new UserJoinedPool(`${event.block.block.header.number.toNumber()}-${event.idx}`);
  logger.info(`joined pool ${event.block.hash.toString()}`);
  const {
    extrinsic: eventExtrinsic,
    event: {
      data: [, poolId]
    }
  } = event;

  if (eventExtrinsic) {
    const { extrinsic, block, success } = eventExtrinsic;
    const pool = await SponsoredPool.get(poolId.toString());
    if (success && pool) {
      logger.info(`PoolId: ${poolId}`)
      let user = await User.get(extrinsic.signer.toString())
      if (!user) {
        user = new User(extrinsic.signer.toString())
        user.createdAt = block.timestamp; 
      } 
      pool.totalUsers += 1;
      userJoined.poolId = pool.id;

      userJoined.createdAt = block.timestamp;
      userJoined.accountId = user.id;
      
      await user.save();
      await userJoined.save();
      await pool.save();
    }
  }
}

export async function handleSponsoredPoolNewTargets(extrinsic: SubstrateExtrinsic): Promise<void> {
  logger.info(`Sponsored Pool new targets ${extrinsic.block.hash.toString()}`);

  if (extrinsic.success) {
    const record = await SponsoredPool.get(extrinsic.extrinsic.args[0] as unknown as string);

    if (record) {
      record.updatedAt = extrinsic.block.timestamp;
      record.targets = extrinsic.extrinsic.args[1] as unknown as string[];
      
      await record.save();
    }

  }
}

export async function handleSponsoredPoolWithdraw(extrinsic: SubstrateExtrinsic): Promise<void> {
  logger.info(`Sponsored Pool withdraw ${extrinsic.block.hash.toString()}`);

  if (extrinsic.success) {
    await SponsoredPool.remove(extrinsic.extrinsic.args[0] as unknown as string);
  }
}

export async function handleChangePoolName(extrinsic: SubstrateExtrinsic) {
  logger.info(`Change pool name ${extrinsic.block.hash.toString()}`)
  
  if (extrinsic.success) {
    const poolId = extrinsic.extrinsic.args[0] as unknown as string;
    const pool = await SponsoredPool.get(poolId.toString());
    const poolName = extrinsic.extrinsic.args[1] as unknown as string;
  
    logger.info(`new pool name: ${poolName}`)
    pool.poolName = poolName.toString();

    await pool.save();
  }
}

export async function handleClearPoolName(extrinsic: SubstrateExtrinsic) {
  logger.info(`Clear pool name ${extrinsic.block.hash.toString()}`)
  
  if (extrinsic.success) {
    const poolId = extrinsic.extrinsic.args[0] as unknown as string;
    const pool = await SponsoredPool.get(poolId.toString());
    
    logger.info(`Clear pool name: ${poolId}`)
  
    pool.poolName = null;

    await pool.save();
  }
}

export async function  handleEnableWhitelist(extrinsic: SubstrateExtrinsic) {
  logger.info(`Enable whitelist ${extrinsic.block.hash.toString()}`)
  
  if (extrinsic.success) {
    const poolId = extrinsic.extrinsic.args[0] as unknown as string;
    const pool = await SponsoredPool.get(poolId.toString());
    
    logger.info(`Enable whitelist ${poolId}`)
  
    pool.enabledWhitelist = true;

    await pool.save();
  } 
}

export async function handleWithdrawWhitelist(extrinsic: SubstrateExtrinsic) {
  logger.info(`Withdraw whitelist ${extrinsic.block.hash.toString()}`)
  
  if (extrinsic.success) {
    const poolId = extrinsic.extrinsic.args[0] as unknown as string;
    const pool = await SponsoredPool.get(poolId.toString());
    
    logger.info(`Withdraw whitelist ${poolId}`)
  
    pool.enabledWhitelist = false;

    await pool.save();
  } 
}

export * from "./contractHandlers"