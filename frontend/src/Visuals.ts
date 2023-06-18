import { SkinId, NonEmptyArray, Skin } from '../../common/src/Types'
import { AvatarDecoration, AvatarDecorationId } from '../../common/src/Deco'

import bunny from './images/chars/bunny.png'
import cat from './images/chars/cat.png'
import bear from './images/chars/bear.png'
import panda from './images/chars/panda.png'

import boatBunny from './images/boats/boat-bunny.png'
import boatCat from './images/boats/boat-cat.png'
import boatBear from './images/boats/boat-bear.png'
import boatPanda from './images/boats/boat-panda.png'

import bowBase from './images/deco/bow-base.png'
import bowMask from './images/deco/bow-mask.png'
import beretBase from './images/deco/beret-base.png'
import beretMask from './images/deco/beret-mask.png'
import squareGlasses from './images/deco/square-glasses.png'

export const AVATAR_DECORATIONS: NonEmptyArray<AvatarDecoration> = [
    {
      id: AvatarDecorationId.BOW,
      avatarSource: bowBase,
      avatarMask: bowMask,
    },
    {
      id: AvatarDecorationId.BERET,
      avatarSource: beretBase,
      avatarMask: beretMask,
    },
    {
      id: AvatarDecorationId.SQUARE_GLASSES,
      avatarSource: squareGlasses,
    },
]

export const SKINS: NonEmptyArray<Skin> = [
  {
    id: SkinId.BUNNY,
    avatarSource: bunny,
    boatSource: boatBunny,
  },
  {
    id: SkinId.CAT,
    avatarSource: cat,
    boatSource: boatCat,
  },
  {
    id: SkinId.DOG,
    avatarSource: bunny,
    boatSource: boatBunny,
  },
  {
    id: SkinId.BEAR,
    avatarSource: bear,
    boatSource: boatBear,
  },
  {
    id: SkinId.PANDA,
    avatarSource: panda,
    boatSource: boatPanda,
  },
]