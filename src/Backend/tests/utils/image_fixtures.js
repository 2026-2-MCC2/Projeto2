// só os primeiros bytes de cada formato importam: é o que a API confere para saber o tipo real
export class ImageFixtures {
  static JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('jpg de teste')])
  static PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('png de teste')])
  static WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x10, 0, 0, 0]), Buffer.from('WEBPVP8 teste')])
  static TEXT = Buffer.from('não sou uma foto')

  static pngOfSize(bytes) {
    return Buffer.concat([ImageFixtures.PNG, Buffer.alloc(Math.max(0, bytes - ImageFixtures.PNG.length))])
  }
}
