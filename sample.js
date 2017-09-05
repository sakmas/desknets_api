'use strict';

const DesknetsApi = require('./desknets_api.js');

(async () => {
  // 初期設定
  const desknets_api = new DesknetsApi({
    host: process.env.HOST,
    id: process.env.ID,
    password: process.env.PASSWORD
  });

  await desknets_api.login().catch(e => console.error(e));

  // 設備予約確認
  const before = await desknets_api.search_room({
    place: '2', // 7階会議室
    date: '20170901'
  });

  console.log(before);

  // 設備予約
  await desknets_api.reserve_room({
    place: '2',
    startD: '20170901',
    startH: '21',
    startM: '00',
    endD: '20170901',
    endH: '22',
    endM: '00',
    detail: '打ち合わせ'
  }).then(d => {
    console.log(d);
  });

  // 設備予約確認
  const after = await desknets_api.search_room({
    place: '2',
    date: '20170901'
  });

  console.log(after);

  // 終了
  await desknets_api.close();
})();
