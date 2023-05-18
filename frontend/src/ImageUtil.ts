export { ImageUtil }

import { GifReader } from './GIF.js'

// written by para >:( asshole
// a class that handles images in the game
// can handle both images that need to have a colorable mask on top (like character sprites with colored cloaks)
// and simple images like emotes

class ImageUtil {
  // loads image and returns it as promise
  async _loadImage(imageSrc: string): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        resolve(img)
      }
      img.src = imageSrc
    })
  }

  async _loadGif(src: string): Promise<Drawable> {
    const data = await fetch(src)
      .then((r) => r.arrayBuffer())
      .then((img) => new Uint8Array(img))
    const reader = new GifReader(data)
    const frames: { delay: number, image: ImageBitmap }[] = []
    for (let i = 0, len = reader.numFrames(); i < len; ++i) {
      const pixels = new Uint8ClampedArray(4 * reader.width * reader.height)
      reader.decodeAndBlitFrameRGBA(i, pixels)
      const image = await createImageBitmap(new ImageData(pixels, reader.width, reader.height))
      const { delay } = reader.frameInfo(i)
      frames.push({ delay, image })
    }
    if (frames.length === 0) {
      throw new Error('no frames in gif')
    }

    // we start at the last frame and a `last` value of 0, because 
    // `maybeAdvanceToNextFrame` is called each time `image` is called.
    // this will make it so that the first frame displayed is also the 
    // actual first frame of the gif
    let frameIdx = frames.length - 1
    let last = 0

    const maybeAdvanceToNextFrame = (): void => {
      // check if delay has passed. if yes, go to next frame 
      // when the last frame is reached, start from frame 0 again
      const now = performance.now() / 10 // hundrets of a second
      if (now - last >= frames[frameIdx].delay) {
        frameIdx = frameIdx < (frames.length - 1) ? frameIdx + 1 : 0
        last = now
      }
    }

    return {
      image: () => {
        maybeAdvanceToNextFrame()
        return frames[frameIdx].image
      },
    }
  }

  // the new canvas will be as big as the image itself
  _createCanvas(width: number, height: number): HTMLCanvasElement {
    const c = document.createElement('canvas')
    c.width = width
    c.height = height
    return c
  }

  // sprite with colored mask
  // three things need to go inside: the sprite, the mask of the sprite (the cloak), and the color it's supposed to be painted
  async asMaskedDrawable(imageSrc: string, maskSrc: string, color: string): Promise<Drawable> {
    // wait to load the sprite and its mask
    const image = await this._loadImage(imageSrc)
    const mask = await this._loadImage(maskSrc)

    //create a new freakin canvas
    const c = this._createCanvas(image.width, image.height)
    const ctx = c.getContext('2d') as CanvasRenderingContext2D

    // mask shenanigans
    ctx.save()
    ctx.drawImage(mask, 0, 0)
    ctx.fillStyle = color
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillRect(0, 0, mask.width, mask.height)
    ctx.restore()
    ctx.save()
    ctx.globalCompositeOperation = 'destination-over'
    ctx.drawImage(image, 0, 0)
    ctx.restore()

    // image bitmap? wut
    const maskedImage = await createImageBitmap(c)

    return { image: () => maskedImage }
  }

  async asDrawable(src: string): Promise<Drawable> {
    try {
      // attempt loading the image as gif
      // NOTE: this is a hack, and you should instead infer the image type from the request headers
      return await this._loadGif(src)
    } catch (_) {
      // otherwise load it as static
      const image = await this._loadImage(src)
      return { image: () => image }
    }
  }
}

interface Drawable {
  image: () => HTMLImageElement | ImageBitmap,
}
