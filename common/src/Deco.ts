export enum AvatarDecorationId {
    BOW = 'bow',
    BERET = 'beret',
    SQUARE_GLASSES = 'square-glasses',
}

export interface AvatarDecoration {
  id: AvatarDecorationId,
  avatarSource: any,
  avatarMask?: any,
  boatSource?: any,
  boatMask?: any,
  luckBoost?: number,
  maxSpeedBoost?: number,
}