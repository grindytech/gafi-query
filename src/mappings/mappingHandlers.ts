import { SubstrateExtrinsic, SubstrateEvent, SubstrateBlock } from "@subql/types";
import { Transfer, BlockEntity, SponsoredPool, UserJoinedPool } from "../types";
import { Balance } from "@polkadot/types/interfaces";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
  let record = new BlockEntity(block.block.header.hash.toString());

  record.field1 = block.block.header.number.toNumber();
  await record.save();
}

export async function handleEvent(event: SubstrateEvent): Promise<void> {
  const [from, to, amount, ...rest] = event.event.data;

  const transfer = new Transfer(`${event.block.block.header.number.toNumber()}-${event.idx}`);

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
      data: [, poolInfo]
    }
  } = event;

  const parsedPoolInfo = JSON.parse(poolInfo.toString())
  
  if (eventExtrinsic && parsedPoolInfo.sponsored) {
    const { extrinsic, block, success } = eventExtrinsic;
    if (success) {
      logger.info(`parsedPoolInfo.sponsored: ${parsedPoolInfo.sponsored}`)
      const pool = await SponsoredPool.get(parsedPoolInfo.sponsored);
      pool.totalUsers += 1;
      userJoined.poolId = pool.id;

      userJoined.createdAt = block.timestamp;
      userJoined.account = extrinsic.signer.toString();
      await userJoined.save();
      await pool.save();
    }
  }
}
