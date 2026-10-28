// Silah koleksiyonları (Valorant tarzı takımlar): her koleksiyon TÜM silah sınıflarına uyumlu bir şekil + renk + parlama seti uygular.
// Şekil parçaları weapons.js içinde silahın kendi ölçülerine göre üretilir (bıçak, tabanca, pompalı, tüfek, keskin nişancı...).
// fiyat: { cur: 'px' | 'gem' | 'pass', n }, r: nadirlik 0-3
(function (root) {
  const C = (name, r, price, main, accent, glow, ops, desc) => ({ name, r, price, main, accent, glow, ops, desc });
  const LIST = [
    { name: 'Yok', r: 0, price: { cur: 'px', n: 0 }, main: null, accent: 0, glow: 0, ops: [], desc: '' },
    C('Neon Şafak', 1, { cur: 'px', n: 900 }, 0x1b1f3a, 0xff2d95, 0x35e0ff, [['rail'], ['stripes']], 'Mor gövde, neon ray ve yan şeritler'),
    C('Orman Ruhu', 1, { cur: 'px', n: 800 }, 0x2f5d2a, 0x8d6e3f, 0x9be36a, [['spikes', 3], ['charm'], ['stripes']], 'Yosunlu gövde, ağaç dalı süsler'),
    C('Şeker Dükkanı', 1, { cur: 'px', n: 800 }, 0xff7eb6, 0xffffff, 0xffe066, [['crown'], ['charm'], ['stripes']], 'Pembe, şekerli ve neşeli'),
    C('Kızıl Oni', 2, { cur: 'gem', n: 45 }, 0x121216, 0xc62828, 0xff3b30, [['horns'], ['spikes', 4], ['ring']], 'Kara gövde, kızıl boynuzlar ve dikenler'),
    C('Buz Kraliçesi', 2, { cur: 'gem', n: 45 }, 0xbdefff, 0xffffff, 0x7df9ff, [['crystal'], ['spikes', 5], ['shroud']], 'Buz kristalleri ve donmuş namlu'),
    C('Lav Çekirdeği', 2, { cur: 'gem', n: 45 }, 0x2b1b14, 0xff6a00, 0xffb000, [['fins'], ['stripes'], ['rail']], 'Erimiş damarlar, kor gibi parlayan şeritler'),
    C('Elektrik', 2, { cur: 'gem', n: 40 }, 0x222a35, 0xfff200, 0x4fc3f7, [['ring'], ['stripes'], ['rail'], ['crystal']], 'Sarı volt halkaları ve mavi arklar'),
    C('Nöbetçi', 2, { cur: 'px', n: 1500 }, 0x3b4a3a, 0xd0d0d0, 0xffb000, [['shroud'], ['rail'], ['fins']], 'Taktik gövde, kalkan ve ray'),
    C('Altın Çağ', 3, { cur: 'gem', n: 90 }, 0xf1c40f, 0xfff1a8, 0xffd23f, [['fins'], ['crown'], ['rail'], ['charm']], 'Altın kaplama, taç ve yelken kanatlar'),
    C('Glitch', 3, { cur: 'gem', n: 90 }, 0x151515, 0x00ff9d, 0xff00e6, [['frags'], ['rail'], ['stripes']], 'Bozulmuş piksel blokları ve neon'),
    C('Galaktik', 3, { cur: 'pass', n: 0 }, 0x1a1040, 0xb388ff, 0xffffff, [['wings'], ['crystal'], ['ring'], ['rail']], 'Yıldız tozu, kristal ve uzay halkaları (sezon pası)'),
    C('Ejder Dişi', 3, { cur: 'pass', n: 0 }, 0x14301f, 0xe8e0c0, 0xff6a00, [['horns'], ['spikes', 6], ['wings'], ['crystal']], 'Pullu gövde, diş ve boynuz, kor gözlü (sezon pası)'),
  ];
  const api = { LIST, COUNT: LIST.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VColls = api;
})(typeof self !== 'undefined' ? self : this);
