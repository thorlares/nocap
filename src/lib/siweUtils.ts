// import {
//   type SIWEVerifyMessageArgs,
//   type SIWECreateMessageArgs,
//   createSIWEConfig,
//   formatMessage,
//   SIWEMessageArgs
// } from '@reown/appkit-siwe'
// import { generateNonce } from 'siwe'
// import { getAddress } from 'viem'

// // Normalize the address (checksum)
// const normalizeAddress = (address: string): string => {
//   try {
//     const splitAddress = address.split(':')
//     const extractedAddress = splitAddress[splitAddress.length - 1]
//     const checksumAddress = getAddress(extractedAddress)
//     splitAddress[splitAddress.length - 1] = checksumAddress
//     const normalizedAddress = splitAddress.join(':')

//     return normalizedAddress
//   } catch (error) {
//     return address
//   }
// }

// export const createSIWE = (
//   getMessageParams: () => Promise<SIWEMessageArgs>,
//   verifyMessage: (args: SIWEVerifyMessageArgs) => Promise<boolean>
// ) => {
//   return createSIWEConfig({
//     signOutOnAccountChange: true,
//     signOutOnNetworkChange: true,
//     getMessageParams,
//     createMessage: ({ address, ...args }: SIWECreateMessageArgs) => {
//       // normalize the address in case you are not using our library in the backend
//       return formatMessage(args, normalizeAddress(address))
//     },
//     getNonce: async (): Promise<string> => generateNonce(),
//     getSession: async () => null,
//     verifyMessage,
//     signOut: async (): Promise<boolean> => true
//   })
// }
