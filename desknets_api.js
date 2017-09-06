'use strict';

const puppeteer = require('puppeteer');

class DesknetsApi {
  /**
   * コンストラクタ
   * @param {object} params desknets情報
   * @param {string} params.host ホスト名
   * @param {string} params.id ユーザーID
   * @param {string} params.password パスワード
   */
  constructor(params) {
    if (!params.host || !params.id || !params.password) {
      throw new Error('desknet\'sのhost/ID/パスワードを指定して下さい。');
    }
    this.host = params.host;
    this.id = params.id;
    this.password = params.password;
  }

  /**
   * 初期処理。ヘッドレスブラウザを立ち上げる
   * @private
   **/
  async init() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setRequestInterceptionEnabled(true);
    page.on('request', request => {
      if (request.url.endsWith('.png') || request.url.endsWith('.jpg') ||
          request.url.endsWith('.jpeg') || request.url.endsWith('.gif')) {
        request.abort();
      } else {
        request.continue();
      }
    });
    this.browser = browser;
    this.page = page;
  }

  /**
   * ログインする
   * @param {object} page puppeteer pageオブジェクト
   * @return {promise} ログイン結果
   * @public
   */
  async login() {
    await this.init();
    await this.page.goto(`https://${this.host}/cgi-bin/dneo/dneo.cgi`);
    await this.page.focus('input[name="UserID"]');
    await this.page.type(this.id);
    await this.page.focus('input[name="_word"]');
    await this.page.type(this.password);
    await this.page.click('#login-btn');
    // ログインエラー
    let error = await this.page.waitForSelector('h3.co-message', {timeout: 1500}).then(async () => {
      return await this.page.evaluate(() => document.querySelector('h3.co-message').textContent);
    }).catch(() => null);
    if (error) {
      this.browser.close();
      return Promise.reject(error);
    }
    return Promise.resolve();
  }

  /**
   * 会議室の予約状況参照
   * @param {object} params 検索情報
   * @param {string} params.place 会議室ID
   * @param {string} params.date 検索年月日
   * @return {promise} 予約状況配列
   * @public
   */
  async search_room(params) {
    await this.page.goto(`https://${this.host}/cgi-bin/dneo/dneo.cgi?cmd=plantweekgrp&log=on#cmd=plantdaygrp&pid=2&date=${params.date}`, {waitUntil: 'networkidle'});
    await this.page.waitForSelector(`.jplant-cal-time-line[data-target='${params.place}']`);
    const result =  await this.page.evaluate(params => {
      const boxes = document.querySelectorAll(`.jplant-cal-time-line[data-target='${params.place}'] .cal-h-box-data div .cal-item-box`);
      return Array.from(boxes, box => box.querySelector('a').title).map(result => ({time: result.substring(0, 13), detail: result.substring(14, result.length)}));
    }, params);
    return result;
  }

  /**
   * 会議室を予約する
   * @param {object} params 予約情報
   * @param {string|number} params.place 会議室ID
   * @param {string|number} params.startD 使用開始年月
   * @param {string|number} params.startH 使用開始時
   * @param {string|number} params.startM 使用開始分[00|15|30|45]
   * @param {string|number} params.endD 使用終了年月
   * @param {string|number} params.endH 使用終了時
   * @param {string|number} params.endM 使用終了分[00|15|30|45]
   * @param {string} params.detail 利用目的
   * @return {promise} 予約追加結果
   * @public
   */
  async reserve_room(params) {
    await this.page.goto(`https://${this.host}/cgi-bin/dneo/dneo.cgi?cmd=plantweekgrp&log=on#cmd=plantadd&date=${params.startD}&enddate=${params.endD}&id=${params.place}`, {waitUntil: 'networkidle'});
    await this.page.waitForSelector('.co-timepicker-hour');
    // 日時
    await this.page.evaluate(params => {
      document.querySelector('input[name="starttime"]').value = `${params.startH}${params.startM}`;
      document.querySelector('input[name="endtime"]').value = `${params.endH}${params.endM}`;
      return Promise.resolve();
    }, params);
    // 利用目的
    await this.page.focus('input[name="detail"]');
    await this.page.type(params.detail);
    // 送信
    await this.page.click('div.top input[type="submit"]');
    // エラー判定
    let result =  await this.page.waitForSelector('h3.co-message', {timeout: 1000}).then(async () => {
      const message = await this.page.evaluate(() => document.querySelector('h3.co-message').textContent);
      await this.page.close();
      this.page = await this.browser.newPage();
      return {status: 'error', message: message};
    }).catch(() => ({status: 'success'}));
    return Promise.resolve(result);
  }

  /**
   * ヘッドレスブラウザを閉じる
   * @public
   **/
  async close() {
    if (this.browser) {
      this.browser.close();
    }
  }
}

module.exports = DesknetsApi;
