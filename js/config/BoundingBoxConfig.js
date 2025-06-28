export const BACKGROUND_CONFIG = {
    'bookcase.png': {
        spriteCount: 25,
        boundingBoxes: [
            {
                "id": 1751078097964,
                "x": 23,
                "y": -0.4666595458984375,
                "width": 170,
                "height": 113
            },
            {
                "id": 1751078102579,
                "x": 174,
                "y": 22.533340454101562,
                "width": 176,
                "height": 101
            },
            {
                "id": 1751078106421,
                "x": 96,
                "y": 100.53334045410156,
                "width": 247,
                "height": 130
            },
            {
                "id": 1751078108865,
                "x": 86,
                "y": 221.53334045410156,
                "width": 258,
                "height": 125
            },
            {
                "id": 1751078111614,
                "x": 158,
                "y": 352.53334045410156,
                "width": 185,
                "height": 148
            },
            {
                "id": 1751078115664,
                "x": 5,
                "y": 364.53334045410156,
                "width": 88,
                "height": 251
            },
            {
                "id": 1751078120435,
                "x": 324,
                "y": 384.53334045410156,
                "width": 87,
                "height": 231
            },
            {
                "id": 1751078127714,
                "x": 97,
                "y": 483.53334045410156,
                "width": 229,
                "height": 134
            },
            {
                "id": 1751078147216,
                "x": 352,
                "y": 135.53334045410156,
                "width": 60,
                "height": 103
            }
        ]
    }
};

export function getBoundingBoxesForBackground(backgroundFilename) {
    const config = BACKGROUND_CONFIG[backgroundFilename];
    return config ? config.boundingBoxes : [];
}

export function getSpriteCountForBackground(backgroundFilename) {
    const config = BACKGROUND_CONFIG[backgroundFilename];
    return config ? config.spriteCount : 50; // Default to 50 if not configured
}