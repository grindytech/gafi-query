import { SubstrateExtrinsic, SubstrateEvent, SubstrateBlock } from "@subql/types";
import { Transfer } from "../types";
import { Balance } from "@polkadot/types/interfaces";

// export async function handleBlock(block: SubstrateBlock): Promise<void> {
//   //Create a new starterEntity with ID using block hash
//   let record = new StarterEntity(block.block.header.hash.toString());
//   //Record block number
//   record.field1 = block.block.header.number.toNumber();
//   await record.save();
// }

export async function handleEvent(event: SubstrateEvent): Promise<void> {
  const [from, to, amount, ...rest] = event.event.data;

  const transfer = new Transfer(`${event.block.block.header.number.toNumber()}-${event.idx}`);

  transfer.blockNumber = event.block.block.header.number.toBigInt();
  transfer.from = from.toString();
  transfer.to = to.toString();
  transfer.amount = (amount as Balance).toBigInt();
  await transfer.save();
}

// export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
//   const record = await StarterEntity.get(extrinsic.block.block.header.hash.toString());
//   //Date type timestamp
//   record.field4 = extrinsic.block.timestamp;
//   //Boolean tyep
//   record.field5 = true;
//   await record.save();
// }
