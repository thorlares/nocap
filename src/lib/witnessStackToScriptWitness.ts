import * as varuint from 'varuint-bitcoin'

/**
 * Helper function that produces a serialized witness script
 * https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/csv.spec.ts#L477
 */
export function witnessStackToScriptWitness(witness: Uint8Array[]): Uint8Array {
  let buffer = new Uint8Array(0)

  function writeSlice(slice: Uint8Array): void {
    var mergedArray = new Uint8Array(buffer.length + slice.length)
    mergedArray.set(buffer)
    mergedArray.set(slice, buffer.length)
    buffer = mergedArray
  }

  function writeVarInt(i: number): void {
    const currentLen = buffer.length
    const varintLen = varuint.encodingLength(i)

    var mergedArray = new Uint8Array(buffer.length + varintLen)
    mergedArray.set(buffer)
    buffer = mergedArray
    varuint.encode(i, buffer, currentLen)
  }

  function writeVarSlice(slice: Uint8Array): void {
    writeVarInt(slice.length)
    writeSlice(slice)
  }

  function writeVector(vector: Uint8Array[]): void {
    writeVarInt(vector.length)
    vector.forEach(writeVarSlice)
  }

  writeVector(witness)

  return buffer
}
