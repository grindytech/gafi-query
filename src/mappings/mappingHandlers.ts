import { SubstrateExtrinsic, SubstrateEvent, SubstrateBlock } from "@subql/types";
import { Transfer, BlockEntity, SponsoredPool } from "../types";
import { Balance } from "@polkadot/types/interfaces";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
  //Create a new starterEntity with ID using block hash
  let record = new BlockEntity(block.block.header.hash.toString());
  //Record block number
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
  //Date type timestamp
  record.field4 = extrinsic.block.timestamp;
  //Boolean tyep
  record.field5 = true;
  await record.save();
}
export async function handleSponsoredPoolCreate(event: SubstrateEvent): Promise<void> {
  const createdPool = new SponsoredPool(`${event.block.block.header.number.toNumber()}-${event.idx}`);
  //Date type timestamp
  const { extrinsic } = event;
  if (extrinsic) {
    createdPool.poolOwner = extrinsic.extrinsic.signer.toString();
    createdPool.amount = extrinsic.extrinsic.args[1] as unknown as bigint;
    createdPool.discount = extrinsic.extrinsic.args[2] as unknown as bigint;
    createdPool.txLimit = extrinsic.extrinsic.args[3] as unknown as number;

    //Boolean tyep
    createdPool.createdAt = extrinsic.block.timestamp;
    await createdPool.save();
  }
}
