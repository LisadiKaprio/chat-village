import { SkinId, NonEmptyArray, Skin } from './Types'

export interface AvatarDecoration {
id: AvatarDecorationId,
name: string,
price: number,
avatarSource: any,
avatarMask?: any,
boatSource?: any,
boatMask?: any,
luckBoost?: number,
maxSpeedBoost?: number,
}

export enum AvatarDecorationId {
  BOW = 'bow',
  BERET = 'beret',
  SQUARE_GLASSES = 'square-glasses',
}

export const AVATAR_DECORATIONS: NonEmptyArray<AvatarDecoration> = [
    {
      id: AvatarDecorationId.BOW,
      name: 'Bow',
      price: 50,
      avatarSource: '../src/images/deco/bow-base.png',
      avatarMask: '../src/images/deco/bow-mask.png',
    },
    {
      id: AvatarDecorationId.BERET,
      name: 'Beret',
      price: 250,
      avatarSource: '../src/images/deco/beret-base.png',
      avatarMask: '../src/images/deco/beret-mask.png',
    },
    {
      id: AvatarDecorationId.SQUARE_GLASSES,
      name: 'Square Glasses',
      price: 100,
      avatarSource: '../src/images/deco/square-glasses.png',
    },
]

export const SKINS: NonEmptyArray<Skin> = [
  {
    id: SkinId.BUNNY,
    avatarSource: '../src/images/chars/bunny.png',
    boatSource: '../src/images/boats/boat-bunny.png',
  },
  {
    id: SkinId.CAT,
    avatarSource: '../src/images/chars/cat.png',
    boatSource: '../src/images/boats/boat-cat.png',
  },
  {
    id: SkinId.DOG,
    avatarSource: '../src/images/chars/bunny.png',
    boatSource: '../src/images/boats/boat-bunny.png',
  },
  {
    id: SkinId.BEAR,
    avatarSource: '../src/images/chars/bear.png',
    boatSource: '../src/images/boats/boat-bear.png',
  },
  {
    id: SkinId.PANDA,
    avatarSource: '../src/images/chars/panda.png',
    boatSource: '../src/images/boats/boat-panda.png',
  },
]