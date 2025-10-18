import { createHash } from 'crypto';
/**
 * Function to generate a SHA-256 hash of a given input.
 * @param input - The input string to hash.
 * @returns The SHA-256 hash as a hexadecimal string.
 */
export function sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
}