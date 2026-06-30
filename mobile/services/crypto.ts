import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.EXPO_PUBLIC_CHAT_SECRET_KEY!;

export function encryptMessage(plaintext: string): string {
  return CryptoJS.AES.encrypt(plaintext, SECRET_KEY).toString();
}

export function decryptMessage(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}