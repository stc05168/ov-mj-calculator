// 牌型定義
const TILE_TYPES = {
    CHARACTERS: '萬子',
    BAMBOOS: '索子',
    DOTS: '筒子',
    HONORS: '字牌',
    FLOWERS: '花牌'
};

// 所有牌型數據
const ALL_TILES = [
    // 萬子
    { type: TILE_TYPES.CHARACTERS, value: 1, display: '一萬', cssClass: 'character' },
    { type: TILE_TYPES.CHARACTERS, value: 2, display: '二萬', cssClass: 'character' },
    { type: TILE_TYPES.CHARACTERS, value: 3, display: '三萬', cssClass: 'character' },
    { type: TILE_TYPES.CHARACTERS, value: 4, display: '四萬', cssClass: 'character' },
    { type: TILE_TYPES.CHARACTERS, value: 5, display: '五萬', cssClass: 'character' },
    { type: TILE_TYPES.CHARACTERS, value: 6, display: '六萬', cssClass: 'character' },
    { type: TILE_TYPES.CHARACTERS, value: 7, display: '七萬', cssClass: 'character' },
    { type: TILE_TYPES.CHARACTERS, value: 8, display: '八萬', cssClass: 'character' },
    { type: TILE_TYPES.CHARACTERS, value: 9, display: '九萬', cssClass: 'character' },
    
    // 索子
    { type: TILE_TYPES.BAMBOOS, value: 1, display: '一索', cssClass: 'bamboo' },
    { type: TILE_TYPES.BAMBOOS, value: 2, display: '二索', cssClass: 'bamboo' },
    { type: TILE_TYPES.BAMBOOS, value: 3, display: '三索', cssClass: 'bamboo' },
    { type: TILE_TYPES.BAMBOOS, value: 4, display: '四索', cssClass: 'bamboo' },
    { type: TILE_TYPES.BAMBOOS, value: 5, display: '五索', cssClass: 'bamboo' },
    { type: TILE_TYPES.BAMBOOS, value: 6, display: '六索', cssClass: 'bamboo' },
    { type: TILE_TYPES.BAMBOOS, value: 7, display: '七索', cssClass: 'bamboo' },
    { type: TILE_TYPES.BAMBOOS, value: 8, display: '八索', cssClass: 'bamboo' },
    { type: TILE_TYPES.BAMBOOS, value: 9, display: '九索', cssClass: 'bamboo' },
    
    // 筒子
    { type: TILE_TYPES.DOTS, value: 1, display: '一筒', cssClass: 'dot' },
    { type: TILE_TYPES.DOTS, value: 2, display: '二筒', cssClass: 'dot' },
    { type: TILE_TYPES.DOTS, value: 3, display: '三筒', cssClass: 'dot' },
    { type: TILE_TYPES.DOTS, value: 4, display: '四筒', cssClass: 'dot' },
    { type: TILE_TYPES.DOTS, value: 5, display: '五筒', cssClass: 'dot' },
    { type: TILE_TYPES.DOTS, value: 6, display: '六筒', cssClass: 'dot' },
    { type: TILE_TYPES.DOTS, value: 7, display: '七筒', cssClass: 'dot' },
    { type: TILE_TYPES.DOTS, value: 8, display: '八筒', cssClass: 'dot' },
    { type: TILE_TYPES.DOTS, value: 9, display: '九筒', cssClass: 'dot' },
    
    // 字牌
    { type: TILE_TYPES.HONORS, value: 1, display: '東', cssClass: 'honor' },
    { type: TILE_TYPES.HONORS, value: 2, display: '南', cssClass: 'honor' },
    { type: TILE_TYPES.HONORS, value: 3, display: '西', cssClass: 'honor' },
    { type: TILE_TYPES.HONORS, value: 4, display: '北', cssClass: 'honor' },
    { type: TILE_TYPES.HONORS, value: 5, display: '中', cssClass: 'honor' },
    { type: TILE_TYPES.HONORS, value: 6, display: '發', cssClass: 'honor' },
    { type: TILE_TYPES.HONORS, value: 7, display: '白', cssClass: 'honor' }
];

// 花牌數據
const FLOWER_TILES = [
    { type: TILE_TYPES.FLOWERS, value: 1, display: '春', cssClass: 'flower', seatWind: '東' },
    { type: TILE_TYPES.FLOWERS, value: 2, display: '夏', cssClass: 'flower', seatWind: '南' },
    { type: TILE_TYPES.FLOWERS, value: 3, display: '秋', cssClass: 'flower', seatWind: '西' },
    { type: TILE_TYPES.FLOWERS, value: 4, display: '冬', cssClass: 'flower', seatWind: '北' },
    { type: TILE_TYPES.FLOWERS, value: 5, display: '梅', cssClass: 'flower', seatWind: '東' },
    { type: TILE_TYPES.FLOWERS, value: 6, display: '蘭', cssClass: 'flower', seatWind: '南' },
    { type: TILE_TYPES.FLOWERS, value: 7, display: '菊', cssClass: 'flower', seatWind: '西' },
    { type: TILE_TYPES.FLOWERS, value: 8, display: '竹', cssClass: 'flower', seatWind: '北' }
];