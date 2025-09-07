import { getPool, closePool } from '../lib/db.js';

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

async function main() {
  const beansCount = Number(process.argv[2] || 12);
  const brewsPerBean = Number(process.argv[3] || 2);
  const tastingsPerBrew = Number(process.argv[4] || 1);

  const pool = getPool();
  try {
    const origins = ['Colombia', 'Brazil', 'Ethiopia', 'Kenya', 'Guatemala', 'Costa Rica', 'Indonesia', 'Tanzania'];
    const processes = ['Washed', 'Natural', 'Honey', 'Anaerobic'];
    const roastLevels = ['light', 'medium', 'medium-dark', 'dark'];
    const roasters = ['Demo Roasters', 'Sample Coffee', 'Test Beans', 'Example Roastery'];
    const methods = ['pour-over', 'drip', 'aeropress', 'french press', 'espresso'];

    const flavorProfiles: { name: string; notes: string[]; desc: string }[] = [
      { name: 'Chocolate Blend', notes: ['chocolate', 'nutty', 'caramel'], desc: 'チョコやナッツの甘さが心地よいバランス型。酸味は穏やか。' },
      { name: 'Citrus Floral', notes: ['citrus', 'floral', 'bergamot'], desc: '柑橘の明るい酸とフローラル。軽やかで透明感のある味わい。' },
      { name: 'Berry Bright', notes: ['berry', 'stone fruit', 'tropical'], desc: 'ベリー系のジューシーさと果実味。明るい余韻。' },
      { name: 'Spice Cocoa', notes: ['cocoa', 'spice', 'molasses'], desc: 'スパイスとココアの厚み。ミルクとの相性も良い。' },
    ];

    let beanInserted = 0;
    let brewInserted = 0;
    let tastingInserted = 0;

    for (let i = 0; i < beansCount; i++) {
      const origin = sample(origins);
      const proc = sample(processes);
      const roast = sample(roastLevels);
      const roaster = sample(roasters);
      const profile = sample(flavorProfiles);
      const name = `${origin} ${profile.name} #${i + 1}`;
      const description = `${profile.desc} 産地: ${origin} / 精製: ${proc} / 焙煎度: ${roast}`;

      const beanRes = await pool.query(
        `INSERT INTO beans (name, roaster, origin, process, roast_level, flavor_notes, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [name, roaster, origin, proc, roast, profile.notes, description],
      );
      beanInserted++;
      const beanId = beanRes.rows[0].id as number;

      for (let j = 0; j < brewsPerBean; j++) {
        const method = sample(methods);
        const dose = randInt(14, 20);
        const ratio = randInt(14, 18);
        const temp = randInt(90, 95);
        const time = randInt(120, 240);
        const notes = `${method} / ${dose}g / 1:${ratio} / ${temp}℃ / ${time}s`;
        const brewRes = await pool.query(
          `INSERT INTO brews (bean_id, method, dose_g, ratio, water_temp_c, brew_time_s, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [beanId, method, dose, ratio, temp, time, notes],
        );
        brewInserted++;
        const brewId = brewRes.rows[0].id as number;

        for (let k = 0; k < tastingsPerBrew; k++) {
          const like = randInt(2, 5);
          const tnotesPool = [
            '酸は穏やかでチョコの甘さが続く',
            '柑橘の明るさと華やかさ',
            'ベリーのジューシーさが印象的',
            'ココアの厚みとスパイスの余韻',
            '香りはフローラル、口当たりはスムーズ',
          ];
          const tnotes = sample(tnotesPool);
          await pool.query(
            `INSERT INTO tastings (brew_id, user_id, liking, notes)
             VALUES ($1, $2, $3, $4)`,
            [brewId, null, like, tnotes],
          );
          tastingInserted++;
        }
      }
    }

    console.log(`Inserted beans=${beanInserted}, brews=${brewInserted}, tastings=${tastingInserted}`);
    console.log('次に: pnpm docs:build でドキュメント生成・埋め込みを作成してください。');
  } finally {
    await closePool(pool);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

