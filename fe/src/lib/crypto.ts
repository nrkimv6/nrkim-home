// 간단한 base64 인코딩/디코딩
export function encrypt(data: string): string {
  return Buffer.from(data).toString('base64');
}

export function decrypt(data: string): string {
  return Buffer.from(data, 'base64').toString();
} 