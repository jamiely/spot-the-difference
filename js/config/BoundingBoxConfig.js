export const BACKGROUND_CONFIG = {
  "bookcase.png": {
    spriteCount: 25,
    boundingBoxes: [
      {
        id: 1751079259584,
        x: 20,
        y: 3.0333404541015625,
        width: 327,
        height: 108,
      },
      {
        id: 1751079262586,
        x: 89,
        y: 76.03334045410156,
        width: 257,
        height: 163,
      },
      {
        id: 1751079265351,
        x: 93,
        y: 221.03334045410156,
        width: 252,
        height: 125,
      },
      {
        id: 1751079270785,
        x: 173,
        y: 348.03334045410156,
        width: 241,
        height: 272,
      },
      {
        id: 1751079277052,
        x: 351,
        y: 162.03334045410156,
        width: 63,
        height: 67,
      },
      {
        id: 1751079288904,
        x: 3,
        y: 505.03334045410156,
        width: 172,
        height: 111,
      },
      {
        id: 1751079294122,
        x: 3,
        y: 360.03334045410156,
        width: 89,
        height: 144,
      },
    ],
  },
};

export function getBoundingBoxesForBackground(backgroundFilename) {
  const config = BACKGROUND_CONFIG[backgroundFilename];
  return config ? config.boundingBoxes : [];
}

export function getSpriteCountForBackground(backgroundFilename) {
  const config = BACKGROUND_CONFIG[backgroundFilename];
  return config ? config.spriteCount : 50; // Default to 50 if not configured
}
