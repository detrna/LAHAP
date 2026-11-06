export const GENERATED_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const GENERATED_CODE_LENGTH = 8;
export const MAX_GENERATION_ATTEMPTS = 5;

export type RandomInt = (maxExclusive: number) => number;

export function generateCode(randomInt: RandomInt): string {
    let code = "";
    for (let index = 0; index < GENERATED_CODE_LENGTH; index++) {
        code += GENERATED_CODE_ALPHABET.charAt(randomInt(GENERATED_CODE_ALPHABET.length));
    }
    return code;
}
