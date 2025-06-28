export const BACKGROUND_BOUNDING_BOXES = {
    'bookcase.png': [
        {
            "id": 1751075453710,
            "x": 110,
            "y": 128.53334045410156,
            "width": 218,
            "height": 86
        },
        {
            "id": 1751075469310,
            "x": 112,
            "y": 244.53334045410156,
            "width": 219,
            "height": 87
        },
        {
            "id": 1751075474462,
            "x": 201,
            "y": 357.53334045410156,
            "width": 127,
            "height": 132
        },
        {
            "id": 1751075480109,
            "x": 350,
            "y": 377.53334045410156,
            "width": 63,
            "height": 131
        },
        {
            "id": 1751075488161,
            "x": 258,
            "y": 32.53334045410156,
            "width": 90,
            "height": 65
        },
        {
            "id": 1751075512460,
            "x": 148,
            "y": 30.533340454101562,
            "width": 107,
            "height": 55
        },
        {
            "id": 1751075520625,
            "x": 6,
            "y": 455.53334045410156,
            "width": 86,
            "height": 163
        },
        {
            "id": 1751075537711,
            "x": 100,
            "y": 487.53334045410156,
            "width": 308,
            "height": 126
        }
    ]
};

export function getBoundingBoxesForBackground(backgroundFilename) {
    return BACKGROUND_BOUNDING_BOXES[backgroundFilename] || [];
}