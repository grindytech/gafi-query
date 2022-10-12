import { SubstrateEvent } from "@subql/types";
import { ClaimedContract, CreatedContract, User } from "../types";

export async function handleEvmContractCreated(event: SubstrateEvent): Promise<void> {
  logger.info(`event.event.data ${event.event.data}`)
  const [from, to, ...rest] = event.event.data;

  const creator = await api.query.evm.creators(to.toString());
  logger.info(`creator ${creator.toHuman()}`);
  if (creator && creator.toString() === from.toString()) {
    const createdContract = new CreatedContract(`${event.block.block.header.number.toNumber()}-${event.idx}`);
    let newUser = await User.get(from.toString());
      if (!newUser) {
        newUser = new User(from.toString())
        newUser.createdAt = event.block.timestamp; 
      }
  
    createdContract.contractAddress = to.toString();
    createdContract.accountId = newUser.id.toString();
    createdContract.createdAt = event.block.timestamp;
    await newUser.save();
    await createdContract.save();

  }

}

export async function handleClaimContract(event: SubstrateEvent): Promise<void> {
  logger.info(`claimed contract ${event.block.hash.toString()}`);

  const {
    extrinsic: eventExtrinsic,
    event: {
      data: [contractAddress, accountAddress]
    }
  } = event;

  if (eventExtrinsic) {
    const { extrinsic, block, success } = eventExtrinsic;

    let userClaim = await User.get(accountAddress.toString());
    if (!userClaim) {
      userClaim = new User(accountAddress.toString())
      userClaim.createdAt = block.timestamp; 
    }
    
    if (success) {
      const claimedContract = new ClaimedContract(contractAddress.toString());

      claimedContract.contractAddress = contractAddress.toString();
      claimedContract.createdAt = block.timestamp;
      claimedContract.accountId = userClaim.id.toString();
      await userClaim.save();
      await claimedContract.save();
    }
  }
}

export async function handleChangeContractOwnership(event: SubstrateEvent): Promise<void> {
  logger.info(`change contract ownership ${event.block.hash.toString()}`);

  const {
    extrinsic: eventExtrinsic,
    event: {
      data: [contractAddress, newOwner]
    }
  } = event;

  if (eventExtrinsic) {
    const { extrinsic, block, success } = eventExtrinsic;

    let newContractOwner = await User.get(newOwner.toString());
    if (!newContractOwner) {
      newContractOwner = new User(newOwner.toString())
      newContractOwner.createdAt = block.timestamp; 
    }
    
    if (success) {
      const claimedContract = await ClaimedContract.get(contractAddress.toString());

      if (claimedContract) {
        claimedContract.contractAddress = contractAddress.toString();
        claimedContract.updatedAt = block.timestamp;
        claimedContract.accountId = newContractOwner.id.toString();

        await newContractOwner.save();
        await claimedContract.save();
      }

    }
  }
}