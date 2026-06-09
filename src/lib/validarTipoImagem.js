const MSG_INVALIDO = 'Arquivo inválido. Apenas imagens nos formatos JPG, PNG, GIF, WEBP ou BMP são aceitas.'

export function validarTipoImagem(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const b = new Uint8Array(reader.result)
      const jpeg = b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF
      const png  = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 &&
                   b[4] === 0x0D && b[5] === 0x0A && b[6] === 0x1A && b[7] === 0x0A
      const gif  = b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38
      const webp = b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
                   b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
      const bmp  = b[0] === 0x42 && b[1] === 0x4D
      if (jpeg || png || gif || webp || bmp) resolve(true)
      else reject(new Error(MSG_INVALIDO))
    }
    reader.onerror = () => reject(new Error(MSG_INVALIDO))
    reader.readAsArrayBuffer(file.slice(0, 12))
  })
}
